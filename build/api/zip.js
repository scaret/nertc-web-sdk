const file = require('../file')

const apiSrcDir = './dist/api'
const apiZipPath = apiSrcDir + '.zip'

file.zip(apiZipPath, {
  sources: [
    {
      type: 'directory',
      path: apiSrcDir,
      name: 'api'
    }
  ],
  done () {
    console.log('zip api done')
  },
  onerror (err) {
    throw err
  }
})
