const { getInput, info, setFailed, addPath, debug } = require('@actions/core')
const { exec } = require('@actions/exec')
const parseArgs = require('yargs-parser')

const { installVersion } = require('./installer')

function getArgsFromInput(input) {
  const inputArgs = parseArgs(input)
  return Object.entries(inputArgs).flatMap(([key, value]) => {
    if (key === '_') {
      return value
    }

    if (key.length === 1) {
      return `-${key} ${value}`
    }

    return `--${key}=${value}`
  })
}

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
      debug(`Parsing curl input: ${curl}`)
      const args = getArgsFromInput(curl.replace('curl ', ''))

      debug(`Running vulnapi scan with curl: ${JSON.stringify(args)}`)
      await exec('vulnapi scan curl', args)
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
