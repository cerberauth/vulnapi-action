const { debug, info } = require('@actions/core')
const { getOctokit } = require('@actions/github')
const {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
  find: findTool,
  findAllVersions: findAllToolVersions
} = require('@actions/tool-cache')
const os = require('os')

const owner = 'cerberauth'
const repo = 'vulnapi'

const binName = 'vulnapi'

async function installVersion (version) {
  const arch = os.arch()
  if (version === 'latest') {
    info('Getting latest release')
    version = await getLatestRelease(owner, repo)
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

async function getLatestRelease () {
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

function platformParam () {
  const platform = os.platform()
  if (platform === 'win32') {
    return 'Windows'
  } else if (platform === 'darwin') {
    return 'Darwin'
  } else {
    return 'Linux'
  }
}

function archParam (arch) {
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

function fileExtension () {
  const platform = os.platform()
  if (platform === 'win32') {
    return 'zip'
  } else {
    return 'tar.gz'
  }
}

async function downloadVulnapi (version, arch) {
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

  const { browser_download_url: downloadUrl } = release.data.assets.find(
    asset =>
      asset.name.includes(platformParam()) &&
      asset.name.includes(archParam(arch))
  )
  if (!downloadUrl) {
    throw new Error(
      `No download found for ${platformParam()} ${archParam(arch)}`
    )
  }

  // if (platform === 'win32') {
  //   downloadUrl = octokit.rest.repos.downloadZipballArchive({ owner,  })
  // } else {
  //   downloadUrl = octokit.rest.repos.downloadTarballArchive({ owner, repo, ref: version })
  // }

  // const ext = fileExtension()
  // const url = `${githubRepoDownload}${version}/vulnapi_${platformParam()}_${archParam(arch)}.${ext}`
  info(`Downloading from ${downloadUrl}`)
  const downloadPath = await downloadTool(downloadUrl)
  return downloadPath
}

async function extractArchive (archivePath) {
  const platform = os.platform()
  let extPath

  if (platform === 'win32') {
    extPath = await extractZip(archivePath)
  } else {
    extPath = await extractTar(archivePath)
  }

  return extPath
}

module.exports = { installVersion }
