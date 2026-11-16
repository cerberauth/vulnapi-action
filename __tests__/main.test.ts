/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as exec from '../__fixtures__/exec.js'
import * as fs from '../__fixtures__/fs.js'
import * as github from '../__fixtures__/github.js'
import * as installer from '../__fixtures__/installer.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('fs/promises', () => fs)
jest.unstable_mockModule('../src/installer.js', () => installer)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

const VULNAPI_FAILED =
  "The process '/opt/hostedtoolcache/vulnapi/0.11.0/x64/vulnapi' failed with exit code 1"

const REPORT = JSON.stringify({
  metadata: { total: 1, by_severity: { high: 1 } },
  findings: [
    {
      title: 'JWT Algorithm None',
      severity: 'high',
      url: 'http://localhost:8080'
    }
  ]
})

const listComments = jest.fn()
const createComment = jest.fn()
const updateComment = jest.fn()

function mockInputs(inputs: Record<string, string>) {
  core.getInput.mockImplementation((name) => inputs[name] ?? '')
}

function mockInstalledVersion(version: string) {
  installer.installVersion.mockResolvedValue({
    version,
    installDir: '/path/to/vulnapi'
  })
}

function mockPullRequest(number: number) {
  github.context.eventName = 'pull_request'
  github.context.payload = { pull_request: { number } }
}

function vulnapiArgs(): string[] {
  return exec.exec.mock.calls[0][1] as string[]
}

function flagValue(flag: string): string | undefined {
  const args = vulnapiArgs()
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}

describe('main.ts', () => {
  beforeEach(() => {
    mockInstalledVersion('v0.12.0')
    exec.exec.mockResolvedValue(0)
    fs.readFile.mockResolvedValue(REPORT)
    fs.rm.mockResolvedValue(undefined)

    github.context.eventName = 'push'
    github.context.payload = {}
    listComments.mockResolvedValue({ data: [] })
    github.getOctokit.mockReturnValue({
      paginate: async (
        endpoint: (params: unknown) => Promise<{ data: unknown[] }>,
        params: unknown
      ) => (await endpoint(params)).data,
      rest: { issues: { listComments, createComment, updateComment } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('fails if neither curl nor openapi input is provided', async () => {
    mockInputs({ version: 'latest' })

    await run()

    expect(exec.exec).not.toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith(
      'You must provide curl, openapi or config input'
    )
  })

  describe('configuration file', () => {
    it('scans the target of the configuration file', async () => {
      mockInputs({ version: 'latest', config: 'vulnapi.yaml', env: 'staging' })

      await run()

      const args = vulnapiArgs()
      expect(args.slice(0, 1)).toEqual(['scan'])
      expect(args).toContain('--config=vulnapi.yaml')
      expect(args).toContain('--env=staging')
      expect(args).not.toContain('curl')
      expect(args).not.toContain('openapi')
    })

    it('passes the configuration file along with an openapi input', async () => {
      mockInputs({
        version: 'latest',
        openapi: 'openapi.yaml',
        config: '.vulnapi.yaml'
      })

      await run()

      const args = vulnapiArgs()
      expect(args.slice(0, 3)).toEqual(['scan', 'openapi', 'openapi.yaml'])
      expect(args).toContain('--config=.vulnapi.yaml')
    })

    it('requires vulnapi 0.12.0 or later', async () => {
      mockInstalledVersion('v0.11.0')
      mockInputs({ version: 'v0.11.0', config: 'vulnapi.yaml' })

      await run()

      expect(exec.exec).not.toHaveBeenCalled()
      expect(core.setFailed).toHaveBeenCalledWith(
        'The config and env inputs require vulnapi 0.12.0 or later'
      )
    })
  })

  describe('failing on findings', () => {
    it('fails the workflow when vulnapi exits non-zero on curl scan findings', async () => {
      mockInputs({
        version: 'latest',
        curl: 'curl http://localhost:8080',
        severityThreshold: '7'
      })
      exec.exec.mockResolvedValue(1)

      await run()

      expect(exec.exec).toHaveBeenCalledWith(
        'vulnapi',
        [
          'scan',
          'curl',
          'http://localhost:8080',
          '--severity-threshold=7',
          '--no-progress'
        ],
        expect.anything()
      )
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('vulnapi exited with code 1')
      )
    })

    it('fails the workflow when vulnapi exits non-zero on openapi scan findings', async () => {
      mockInputs({ version: 'latest', openapi: './openapi.yaml' })
      exec.exec.mockResolvedValue(1)

      await run()

      expect(exec.exec).toHaveBeenCalledWith(
        'vulnapi',
        ['scan', 'openapi', './openapi.yaml', '--no-progress'],
        expect.anything()
      )
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('vulnapi exited with code 1')
      )
    })

    it('fails the workflow when vulnapi cannot be run', async () => {
      mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })
      exec.exec.mockRejectedValue(new Error(VULNAPI_FAILED))

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(VULNAPI_FAILED)
    })

    it('still fails the workflow after commenting the findings on the pull request', async () => {
      mockPullRequest(12)
      mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })
      exec.exec.mockResolvedValue(1)

      await run()

      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 12,
          body: expect.stringContaining('JWT Algorithm None')
        })
      )
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('vulnapi exited with code 1')
      )
      expect(createComment.mock.invocationCallOrder[0]).toBeLessThan(
        core.setFailed.mock.invocationCallOrder[0]
      )
    })

    it('passes when vulnapi exits zero, and does not fail on stderr output', async () => {
      mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })

      await run()

      const options = exec.exec.mock.calls[0][2]
      expect(options?.ignoreReturnCode).toBe(true)
      expect(options?.failOnStdErr).toBe(false)
      expect(core.setFailed).not.toHaveBeenCalled()
    })
  })

  describe('pull request comment', () => {
    it('writes a JSON report to a temp file, comments it, then removes it', async () => {
      mockPullRequest(12)
      mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })

      await run()

      const reportPath = flagValue('--output')
      expect(reportPath).toContain('reportx-report-')
      expect(flagValue('--output-format')).toBe('json')
      expect(fs.readFile).toHaveBeenCalledWith(reportPath, 'utf8')
      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('# vulnapi scan results')
        })
      )
      expect(fs.rm).toHaveBeenCalledWith(reportPath, { force: true })
      expect(core.setOutput).not.toHaveBeenCalledWith(
        'report-path',
        expect.anything()
      )
    })

    it('keeps a separate comment per scan-id', async () => {
      mockPullRequest(12)
      mockInputs({
        version: 'latest',
        curl: 'curl http://localhost:8080',
        'scan-id': 'staging'
      })

      await run()

      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringMatching(
            /^<!-- cerberauth\/vulnapi\/staging -->\n# vulnapi scan results \(staging\)/
          )
        })
      )
    })

    it('reuses a JSON output-path for the comment and keeps the file', async () => {
      mockPullRequest(12)
      mockInputs({
        version: 'latest',
        curl: 'curl http://localhost:8080',
        'output-format': 'json',
        'output-path': './vulnapi.json'
      })

      await run()

      expect(vulnapiArgs().filter((a) => a === '--output')).toHaveLength(1)
      expect(fs.readFile).toHaveBeenCalledWith('./vulnapi.json', 'utf8')
      expect(fs.rm).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith(
        'report-path',
        './vulnapi.json'
      )
      expect(createComment).toHaveBeenCalled()
    })

    it('passes the report format as --format to vulnapi 0.11.0 and older', async () => {
      mockInstalledVersion('v0.11.0')
      mockPullRequest(12)
      mockInputs({
        version: 'latest',
        curl: 'curl http://localhost:8080',
        'output-format': 'sarif'
      })

      await run()

      expect(vulnapiArgs()).not.toContain('--output-format')
      expect(vulnapiArgs()).toContain('--format=sarif')
      expect(flagValue('--output')).toContain('.sarif.json')
    })

    it('exposes a non-JSON report as report-path without commenting', async () => {
      mockPullRequest(12)
      mockInputs({
        version: 'latest',
        curl: 'curl http://localhost:8080',
        'output-format': 'sarif',
        'output-path': './vulnapi.sarif.json'
      })

      await run()

      expect(flagValue('--output-format')).toBe('sarif')
      expect(core.setOutput).toHaveBeenCalledWith(
        'report-path',
        './vulnapi.sarif.json'
      )
      expect(createComment).not.toHaveBeenCalled()
    })

    it('does not comment when the comment input is false', async () => {
      mockPullRequest(12)
      mockInputs({
        version: 'latest',
        curl: 'curl http://localhost:8080',
        comment: 'false'
      })

      await run()

      expect(vulnapiArgs()).not.toContain('--output')
      expect(createComment).not.toHaveBeenCalled()
    })

    it('does not comment outside of pull requests', async () => {
      mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })

      await run()

      expect(vulnapiArgs()).not.toContain('--output')
      expect(github.getOctokit).not.toHaveBeenCalled()
    })

    it('warns instead of failing when the report cannot be read', async () => {
      mockPullRequest(12)
      mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })
      fs.readFile.mockRejectedValue(new Error('ENOENT'))

      await run()

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('ENOENT')
      )
      expect(createComment).not.toHaveBeenCalled()
      expect(core.setFailed).not.toHaveBeenCalled()
    })
  })

  it('passes report-url and display inputs through to vulnapi', async () => {
    mockInputs({
      version: 'latest',
      curl: 'curl http://localhost:8080',
      'report-url': 'https://reports.example.com',
      'report-headers': 'Authorization: Bearer abc',
      'show-all-findings': 'true',
      'no-color': 'true'
    })

    await run()

    expect(vulnapiArgs()).toEqual(
      expect.arrayContaining([
        '--report-url',
        'https://reports.example.com',
        '--report-header',
        'Authorization=Bearer abc',
        '--show-all-findings',
        '--no-color'
      ])
    )
  })

  it.each([
    ['v0.11.0', '--rate=10/s'],
    ['v0.9.0', '--rate=10/s'],
    ['v0.8.0', '--rate-limit=10/s']
  ])(
    'uses the rate flag supported by vulnapi %s',
    async (version, expectedFlag) => {
      mockInstalledVersion(version)
      mockInputs({
        version,
        curl: 'curl http://localhost:8080',
        rateLimit: '10/s'
      })

      await run()

      expect(vulnapiArgs()).toContain(expectedFlag)
    }
  )
})
