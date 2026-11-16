import {
  getInput,
  info,
  setFailed,
  addPath,
  debug,
  setSecret
} from '@actions/core'
import { exec, ExecOptions } from '@actions/exec'
import parseArgs from 'yargs-parser'

import { installVersion } from './installer.js'
import { prepareReport, publishReport } from './report.js'

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

// Until 0.11.0, vulnapi writes the --output file in the --format format.
function useFormatForOutputFile(args: string[]) {
  const index = args.indexOf('--output-format')
  if (index === -1) return
  const [, format] = args.splice(index, 2)
  args.push(`--format=${format}`)
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

const authFlagInputs = [
  'client-id',
  'token-url',
  'oauth2-username',
  'login-command',
  'login-url',
  'login-data',
  'login-token-field',
  'jwt-public-key'
]

const authSecretInputs: Record<string, string> = {
  'client-secret': 'VULNAPI_CLIENT_SECRET',
  'oauth2-password': 'VULNAPI_OAUTH2_PASSWORD'
}

function getAuthArgs() {
  const args: string[] = []
  const env: Record<string, string> = {}

  for (const input of authFlagInputs) {
    const value = getInput(input)
    if (value) {
      if (input === 'login-data') {
        setSecret(value)
      }
      args.push(`--${input}=${value}`)
    }
  }

  for (const scope of getInput('oauth2-scopes').split(/\s+/)) {
    if (scope) {
      args.push(`--oauth2-scope=${scope}`)
    }
  }

  for (const [input, name] of Object.entries(authSecretInputs)) {
    const value = getInput(input)
    if (value) {
      setSecret(value)
      env[name] = value
    }
  }

  return { args, env }
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

    let scanArgs: string[]
    const curl = getInput('curl')
    const openapi = getInput('openapi')
    if (curl) {
      debug(`Parsing curl input: ${curl}`)
      scanArgs = ['curl', ...getArgsFromInput(curl.replace(/^curl\s+/, ''))]
    } else if (openapi) {
      scanArgs = ['openapi', openapi]
    } else {
      setFailed('You must provide curl or openapi input')
      return
    }

    const auth = getAuthArgs()
    const commandArgs = ['scan', ...scanArgs, ...commonArgs, ...auth.args]
    const report = prepareReport(commandArgs)
    if (!isVersionAtLeast(resolvedVersion, '0.11.1')) {
      useFormatForOutputFile(commandArgs)
    }
    commandArgs.push('--no-progress')

    const execOptions: ExecOptions = {
      failOnStdErr: false,
      ignoreReturnCode: true,
      env: { ...(process.env as Record<string, string>), ...auth.env }
    }

    debug(`Running vulnapi with: ${JSON.stringify(commandArgs)}`)
    const exitCode = await exec('vulnapi', commandArgs, execOptions)

    await publishReport(report, getInput('token'))

    if (exitCode !== 0) {
      setFailed(
        `vulnapi exited with code ${exitCode}: vulnerabilities at or above the severity threshold were found, or the scan failed`
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      return setFailed(error.message)
    }

    setFailed('An unknown error occurred')
  }
}
