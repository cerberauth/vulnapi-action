import { getInput, info, setFailed, addPath, debug } from '@actions/core'
import { exec, ExecOptions } from '@actions/exec'
import parseArgs from 'yargs-parser'

import { installVersion } from './installer.js'

function getArgsFromInput(input: string) {
  const inputArgs = parseArgs(input)
  debug(`Parsed input args: ${JSON.stringify(inputArgs)}`)
  return Object.entries(inputArgs).flatMap(([key, value]) => {
    if (key === '_') {
      return value as string[]
    }

    const values = Array.isArray(value) ? value : [value]

    if (key.length === 1) {
      return values.flatMap((v) => [`-${key}`, String(v)])
    }

    return values.map((v) => `--${key}=${v}`)
  })
}

function isVersionAtLeast(version: string, target: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split(/[.+-]/)
      .slice(0, 3)
      .map((n) => parseInt(n, 10))

  const current = parse(version)
  if (current.some((n) => Number.isNaN(n))) {
    return true
  }

  const wanted = parse(target)
  for (let i = 0; i < 3; i++) {
    const a = current[i] ?? 0
    const b = wanted[i] ?? 0
    if (a !== b) {
      return a > b
    }
  }
  return true
}

function getCommonArgs(version: string) {
  const commonArgs = []

  // vulnapi renamed the `--rate-limit` flag to `--rate` starting with 0.9.0, and
  // 0.10.0 dropped the deprecated `--rate-limit` alias entirely. Keep the old
  // flag name for versions older than 0.9.0.
  const rateLimitFlag = isVersionAtLeast(version, '0.9.0')
    ? '--rate'
    : '--rate-limit'

  const rateLimit = getInput('rateLimit')
  if (rateLimit) {
    commonArgs.push(`${rateLimitFlag}=${rateLimit}`)
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

    const { version: resolvedVersion, installDir } =
      await installVersion(version)
    info(`vulnapi ${resolvedVersion} has been installed to ${installDir}`)

    addPath(installDir)
    info('vulnapi has been added to the PATH')

    const commonArgs = getCommonArgs(resolvedVersion)

    const execOptions: ExecOptions = {
      failOnStdErr: true
    }

    const curl = getInput('curl')
    const openapi = getInput('openapi')
    if (curl) {
      debug(`Parsing curl input: ${curl}`)
      const args = getArgsFromInput(curl.replace(/^curl\s+/, ''))

      debug(`Running vulnapi scan with curl: ${JSON.stringify(args)}`)
      await exec(
        'vulnapi',
        ['scan', 'curl', ...args, ...commonArgs, '--no-progress'],
        execOptions
      )
    } else if (openapi) {
      debug(`Running vulnapi scan with openapi: ${openapi}`)
      await exec(
        'vulnapi',
        ['scan', 'openapi', openapi, ...commonArgs, '--no-progress'],
        execOptions
      )
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
