/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as installer from '../__fixtures__/installer.js'

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it.skip('fails if no input is provided', async () => {
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case 'version':
          return 'latest'
        case 'curl':
          throw new Error('You must provide curl or openapi input')
        default:
          return ''
      }
    })
    core.addPath.mockImplementation(() => {})
    installer.installVersion.mockImplementation(async () => {
      return '/path/to/vulnapi'
    })

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'You must provide curl or openapi input'
    )
  })
})
