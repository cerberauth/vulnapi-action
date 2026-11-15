import { getInput, setOutput, warning } from '@actions/core'
import {
  appendReportxFlags,
  buildCommentBody,
  isPullRequestEvent,
  parseOutputFlags,
  postScanComment,
  tempReportPath
} from '@cerberauth/gha-reportx'
import { readFile, rm } from 'fs/promises'

const VULNAPI_DOCS_URL = 'https://www.cerberauth.com/docs/vulnapi/'

export interface ScanReport {
  persistedPath?: string
  commentPath?: string
  ownsCommentPath: boolean
}

export function prepareReport(commandArgs: string[]): ScanReport {
  appendReportxFlags(commandArgs)

  const persisted = parseOutputFlags(commandArgs)
  const report: ScanReport = {
    persistedPath: persisted.path,
    ownsCommentPath: false
  }

  if (getInput('comment') === 'false' || !isPullRequestEvent()) {
    return report
  }

  if (persisted.path) {
    if ((persisted.format ?? 'json') === 'json') {
      report.commentPath = persisted.path
    }
    return report
  }

  report.commentPath = tempReportPath('json')
  report.ownsCommentPath = true
  commandArgs.push('--output', report.commentPath, '--output-format', 'json')
  return report
}

export async function publishReport(
  report: ScanReport,
  token: string
): Promise<void> {
  if (report.persistedPath) {
    setOutput('report-path', report.persistedPath)
  }

  if (!report.commentPath) {
    return
  }

  try {
    const reportJson = await readFile(report.commentPath, 'utf8')
    const body = buildCommentBody(reportJson, {
      toolName: 'vulnapi',
      docsUrl: VULNAPI_DOCS_URL,
      scanId: getInput('scan-id') || undefined
    })
    await postScanComment(token, body)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    warning(
      `Skipping PR comment, the vulnapi report is unavailable: ${message}`
    )
  } finally {
    if (report.ownsCommentPath) {
      await rm(report.commentPath, { force: true }).catch(() => {})
    }
  }
}
