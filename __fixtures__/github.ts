import type * as github from '@actions/github'
import { jest } from '@jest/globals'

export const context = {
  eventName: 'push',
  payload: {} as Record<string, unknown>,
  repo: { owner: 'cerberauth', repo: 'vulnapi-action' },
  serverUrl: 'https://github.com',
  runId: 1
}

export const getOctokit = jest.fn<typeof github.getOctokit>()
