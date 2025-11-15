import { debug, info } from '@actions/core'
import { getOctokit } from '@actions/github'
import {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
  find as findTool,
  findAllVersions as findAllToolVersions
} from '@actions/tool-cache'
import os from 'os'

const owner = 'cerberauth'
const repo = 'vulnapi'

const binName = 'vulnapi'

export async function installVersion(version: string) {
  const arch = os.arch()
  if (version === 'latest') {
    info('Getting latest release')
    version = await getLatestRelease()
    info(`Latest release is ${version}`)
  }

  debug(`Checking available versions for ${binName}`)
  const allVersions = findAllToolVersions(binName, arch)
  debug(`Available versions: ${allVersions}`)

  info(`Checking tool cache for ${binName} version ${version}`)
  const toolPath = findTool(binName, version, arch)
  if (toolPath) {
    info(`Found in cache @ ${toolPath}`)
    return toolPath
  }

  info(`Downloading ${binName} version ${version}`)
  const downloadPath = await downloadVulnapi(version, arch)

  info('Extracting...')
  const extPath = await extractArchive(downloadPath)
  info(`Successfully extracted to ${extPath}`)

  info('Adding to the cache ...')
  const cachedDir = await cacheDir(extPath, binName, version, arch)
  info(`Successfully cached to ${cachedDir}`)

  return cachedDir
}

async function getLatestRelease() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set')
  }

  const octokit = getOctokit(process.env.GITHUB_TOKEN)
  const response = await octokit.rest.repos.getLatestRelease({
    owner,
    repo
  })
  return response.data.tag_name
}

function platformParam() {
  const platform = os.platform()
  if (platform === 'win32') {
    return 'Windows'
  } else if (platform === 'darwin') {
    return 'Darwin'
  } else {
    return 'Linux'
  }
}

function archParam(arch: string) {
  if (arch === 'x64') {
    return 'x86_64'
  } else if (arch === 'x32') {
    return 'i386'
  } else if (arch === 'arm64') {
    return 'arm64'
  } else {
    return arch
  }
}

async function downloadVulnapi(version: string, arch: string) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set')
  }

  const octokit = getOctokit(process.env.GITHUB_TOKEN)
  const release = await octokit.rest.repos.getReleaseByTag({
    owner,
    repo,
    tag: version
  })
  if (!release) {
    throw new Error(`Release ${version} not found`)
  }

  if (!release.data?.assets || release.data.assets.length === 0) {
    throw new Error(`No assets found for ${version}`)
  }

  const asset = release.data.assets.find(
    (asset) =>
      asset.name.includes(platformParam()) &&
      asset.name.includes(archParam(arch))
  )
  if (!asset) {
    throw new Error(`No asset found for ${platformParam()} ${archParam(arch)}`)
  }

  const downloadUrl = asset.browser_download_url
  if (!downloadUrl) {
    throw new Error(
      `No download found for ${platformParam()} ${archParam(arch)}`
    )
  }

  info(`Downloading from ${downloadUrl}`)
  const downloadPath = await downloadTool(downloadUrl)
  return downloadPath
}

async function extractArchive(archivePath: string) {
  const platform = os.platform()
  let extPath

  if (platform === 'win32') {
    extPath = await extractZip(archivePath)
  } else {
    extPath = await extractTar(archivePath)
  }

  return extPath
}
