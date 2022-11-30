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
  let createdAt = new Date(mergeRequestInfo.created_at)
  let updatedAt = new Date(mergeRequestInfo.updated_at)
  //30秒内的更新算第一次更新
  let isNewMR = updatedAt - createdAt < 30000

  if (!options.popoGroupId) {
    console.log(`没有 popoGroupId`)
  } else if (options.work_in_progress) {
    console.log(`当前MR还在草稿状态`)
  } else {
    popoMessage += `【${isNewMR ? '新的MR' : mergeRequestInfo.state}】 ${
      mergeRequestInfo.web_url
    }\n`
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
    if (isNewMR) {
      const data = {
        receiver: '' + options.popoGroupId,
        message: popoMessage,
        atUids: atUids
      }
      console.log('推送群消息', data)
      await axios.post('https://admin.netease.im/public-service/robot/team', data)
    } else {
      const data = {
        receiver: `${mergeRequestInfo.author.username}@corp.netease.com`,
        message: popoMessage
      }
      await axios.post('https://admin.netease.im/public-service/robot/p2p', data)
      console.log('推送个人消息', data)
    }
  }
  // let users = await api.Users.all()
}
main()
