const { getInput, info, setFailed, addPath, debug } = require('@actions/core')
const { exec } = require('@actions/exec')
const parseArgs = require('yargs-parser')

const { installVersion } = require('./installer')

function getArgsFromInput(input) {
  const inputArgs = parseArgs(input)
  debug(`Parsed input args: ${JSON.stringify(inputArgs)}`)
  return Object.entries(inputArgs).flatMap(([key, value]) => {
    if (key === '_') {
      return value
    }

    if (key.length === 1) {
      return `-${key}="${value}"`
    }

    return `--${key}="${value}"`
  })
}

function getCommonArgs() {
  const commonArgs = []

  const rateLimit = getInput('rateLimit')
  if (rateLimit) {
    commonArgs.push(`--rate-limit=${rateLimit}`)
  }

  const telemetry = getInput('telemetry')
  if (telemetry && (telemetry === 'false' || telemetry === '0')) {
    commonArgs.push('--sqa-opt-out')
  }

  const scans = getInput('scans')
  if (scans) {
    commonArgs.push(`--scans="${scans}"`)
  }

  const excludeScans = getInput('excludeScans')
  if (excludeScans) {
    commonArgs.push(`--exclude-scans="${excludeScans}"`)
  }

  const proxy = getInput('proxy')
  if (proxy) {
    commonArgs.push(`--proxy="${proxy}"`)
  }

  const severityThreshold = getInput('severityThreshold')
  if (severityThreshold) {
    commonArgs.push(`--severity-threshold=${severityThreshold}`)
  }

  return commonArgs
}

async function run() {
  try {
    const version = getInput('version')
    info(`Setup vulnapi version ${version}`)

    const installDir = await installVersion(version)
    info(`vulnapi has been installed to ${installDir}`)

    addPath(installDir)
    info('vulnapi has been added to the PATH')

    const commonArgs = getCommonArgs()

    const curl = getInput('curl')
    const openapi = getInput('openapi')
    if (curl) {
      debug(`Parsing curl input: ${curl}`)
      const args = getArgsFromInput(curl.replace('curl ', ''))

      debug(
        `Running vulnapi scan with curl: ${JSON.stringify(args)} ${JSON.stringify(commonArgs)}`
      )
      await exec('vulnapi', ['scan', 'curl', ...args, ...commonArgs])
    } else if (openapi) {
      debug(`Running vulnapi scan with openapi: ${openapi}`)
      await exec('vulnapi', ['scan', 'openapi', openapi, ...commonArgs])
    } else {
      setFailed('You must provide curl or openapi input')
    }
  } catch (error) {
    setFailed(error.message)
  }
}

module.exports = { run }
