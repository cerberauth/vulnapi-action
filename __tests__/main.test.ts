/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as exec from '../__fixtures__/exec.js'
import * as installer from '../__fixtures__/installer.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('../src/installer.js', () => installer)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

const VULNAPI_FAILED =
  "The process '/opt/hostedtoolcache/vulnapi/0.11.0/x64/vulnapi' failed with exit code 1"

function mockInputs(inputs: Record<string, string>) {
  core.getInput.mockImplementation((name) => inputs[name] ?? '')
}

function mockInstalledVersion(version: string) {
  installer.installVersion.mockResolvedValue({
    version,
    installDir: '/path/to/vulnapi'
  })
}

describe('main.ts', () => {
  beforeEach(() => {
    mockInstalledVersion('v0.11.0')
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('fails if neither curl nor openapi input is provided', async () => {
    mockInputs({ version: 'latest' })

    await run()

    expect(exec.exec).not.toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith(
      'You must provide curl or openapi input'
    )
  })

  it('fails the workflow when vulnapi exits non-zero on curl scan findings', async () => {
    mockInputs({
      version: 'latest',
      curl: 'curl http://localhost:8080',
      severityThreshold: '7'
    })
    exec.exec.mockRejectedValue(new Error(VULNAPI_FAILED))

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
    expect(core.setFailed).toHaveBeenCalledWith(VULNAPI_FAILED)
  })

  it('fails the workflow when vulnapi exits non-zero on openapi scan findings', async () => {
    mockInputs({ version: 'latest', openapi: './openapi.yaml' })
    exec.exec.mockRejectedValue(new Error(VULNAPI_FAILED))

    await run()

    expect(exec.exec).toHaveBeenCalledWith(
      'vulnapi',
      ['scan', 'openapi', './openapi.yaml', '--no-progress'],
      expect.anything()
    )
    expect(core.setFailed).toHaveBeenCalledWith(VULNAPI_FAILED)
  })

  it('relies on the vulnapi exit code, not on stderr output', async () => {
    mockInputs({ version: 'latest', curl: 'curl http://localhost:8080' })
    exec.exec.mockResolvedValue(0)

    await run()

    const options = exec.exec.mock.calls[0][2]
    // A non-zero exit code must reject so findings fail the workflow.
    expect(options?.ignoreReturnCode).not.toBe(true)
    // Warnings written to stderr (telemetry, deprecations) must not fail it.
    expect(options?.failOnStdErr).toBe(false)
    expect(core.setFailed).not.toHaveBeenCalled()
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
      exec.exec.mockResolvedValue(0)

      await run()

      expect(exec.exec.mock.calls[0][1]).toContain(expectedFlag)
    }
  )
})
