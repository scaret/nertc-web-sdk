#!/usr/bin/node

// 处理MR打开事件
// 1. 获取MR信息
// 2. 获取Reviewer信息
// 3. 将MR合并信息发在群里

const axios = require('axios')
const { Gitlab } = require('@gitbeaker/node')

const { Command } = require('commander')
const program = new Command()

program
  .option('--project-id <number>', 'Project ID', parseInt)
  .option('--merge-request-id <number>', 'Merge request ID', parseInt)
  .option('--popo-group-id <number>', 'POPO group ID', parseInt)

program.parse()
const options = program.opts()
console.log('processMROpen', options)

const api = new Gitlab({
  token: 'j3zK9TMdnwn9ybRbavVm',
  host: 'https://g.hz.netease.com/'
})

const main = async () => {
  const projectInfo = await api.Projects.show(options.projectId)
  const mergeRequestInfo = await api.MergeRequests.show(options.projectId, options.mergeRequestId)
  console.log('projectInfo', projectInfo)
  console.log('mergeRequestInfo', mergeRequestInfo)
  let popoMessage = ''
  let atUids = []
  if (!options.popoGroupId) {
    console.log(`没有 popoGroupId`)
  } else if (options.work_in_progress) {
    console.log(`当前MR还在草稿状态`)
  } else if (mergeRequestInfo.state !== 'opened') {
    console.log(`当前MR状态为：`, mergeRequestInfo.state)
  } else {
    popoMessage += `【新的MR】${mergeRequestInfo.web_url}\n`
    popoMessage += `【标题】${mergeRequestInfo.title}\n`
    if (mergeRequestInfo.description) {
      popoMessage += `${mergeRequestInfo.description}\n`
    }
    popoMessage += `【发起人】${mergeRequestInfo.author.username}    ${mergeRequestInfo.source_branch} => ${mergeRequestInfo.target_branch}\n`
    popoMessage += `\n`
    if (mergeRequestInfo.has_conflicts) {
      popoMessage += `【警告】该MR有冲突\n`
    }
    if (!mergeRequestInfo.reviewers.length) {
      popoMessage += `【警告】该MR未设定Code Review人员\n`
    } else {
      popoMessage += `【代码审核】`
      mergeRequestInfo.reviewers.forEach((reviewer) => {
        popoMessage += reviewer.username
        atUids.push(`${reviewer.username}@corp.netease.com`)
      })
      popoMessage += `\n`
    }
    console.log(popoMessage)
    atUids.push(`${mergeRequestInfo.author.username}@corp.netease.com`)
    const data = {
      receiver: '' + options.popoGroupId,
      message: popoMessage,
      atUids: atUids
    }
    await axios.post('https://admin.netease.im/public-service/robot/team', data)
  }
  // let users = await api.Users.all()
}
main()
