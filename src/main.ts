import { getInput, info, setFailed, addPath, debug } from '@actions/core'
import { exec } from '@actions/exec'
import parseArgs from 'yargs-parser'

import { installVersion } from './installer.js'

function getArgsFromInput(input: string) {
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
    commonArgs.push(`--scans=${scans}`)
  }

  const excludeScans = getInput('excludeScans')
  if (excludeScans) {
    commonArgs.push(`--exclude-scans=${excludeScans}`)
  }

  const proxy = getInput('proxy')
  if (proxy) {
    commonArgs.push(`--proxy=${proxy}`)
  }

  const severityThreshold = getInput('severityThreshold')
  if (severityThreshold) {
    commonArgs.push(`--severity-threshold=${severityThreshold}`)
  }

  return commonArgs
}

export async function run() {
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

      debug(`Running vulnapi scan with curl: ${JSON.stringify(args)}`)
      await exec('vulnapi scan curl', [...args, ...commonArgs])
    } else if (openapi) {
      debug(`Running vulnapi scan with openapi: ${openapi}`)
      await exec('vulnapi scan openapi', [openapi, ...commonArgs])
    } else {
      setFailed('You must provide curl or openapi input')
    }
  } catch (error) {
    if (error instanceof Error) {
      return setFailed(error.message)
    }

    setFailed('An unknown error occurred')
  }
}
