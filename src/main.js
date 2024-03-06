const { getInput, info, setFailed, addPath, debug } = require('@actions/core')
const { exec } = require('@actions/exec')

const { installVersion } = require('./installer')

async function run() {
  try {
    const version = getInput('version')
    info(`Setup vulnapi version ${version}`)

    const installDir = await installVersion(version)
    info(`vulnapi has been installed to ${installDir}`)

    addPath(installDir)
    info('vulnapi has been added to the PATH')

    const curl = getInput('curl')
    const openapi = getInput('openapi')
    if (curl) {
      const curlArg = curl.replace('curl ', '')

      debug(`Running vulnapi scan with curl: ${curlArg}`)
      await exec('vulnapi scan curl', curlArg.split(' '))
    } else if (openapi) {
      debug(`Running vulnapi scan with openapi: ${openapi}`)
      await exec('vulnapi scan openapi', [openapi])
    } else {
      setFailed('You must provide curl or openapi input')
    }
  } catch (error) {
    setFailed(error.message)
  }
}

module.exports = { run }
