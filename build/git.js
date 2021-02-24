const execSync = require('child_process').execSync
const baseOpt = {
  encoding: 'utf8'
}

const obj = {}

obj.hasChange = function () {
  const status = execSync('git status -s', baseOpt)
  return !!status
}

obj.getFirstCommitHash = function () {
  const log = execSync("git log --pretty=format:'%H-%h' -1", baseOpt).split('-')
  return {
    hash: log[0],
    shortHash: log[1]
  }
}

obj.describe = function () {
  const result = execSync("git describe --tags --long --dirty", baseOpt).trim();
  return result;
}

obj.currentBranch = function () {
  //const result = execSync("git branch --show-current", baseOpt).trim();
  const result = execSync("git rev-parse --abbrev-ref HEAD", baseOpt).trim();
  return result;
}

module.exports = obj
