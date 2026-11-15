import type * as fs from 'fs/promises'
import { jest } from '@jest/globals'

export const readFile = jest.fn<typeof fs.readFile>()
export const rm = jest.fn<typeof fs.rm>()
