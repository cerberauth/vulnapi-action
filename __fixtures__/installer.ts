import { jest } from '@jest/globals'

export const installVersion =
  jest.fn<typeof import('../src/installer.js').installVersion>()
