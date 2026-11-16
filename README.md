<!-- markdownlint-disable MD033 MD041 MD013 -->
<!-- textlint-disable -->
<p align="center">
    <img src="https://vulnapi.cerberauth.com/logo-ascii-text-art.png" height="150" alt="vulnapi logo">
</p>
<!-- textlint-enable -->
<!-- markdownlint-enable MD033 MD041 MD013 -->

---

[![Join Discord](https://img.shields.io/discord/1242773130137833493?label=Discord&style=for-the-badge)](https://vulnapi.cerberauth.com/discord)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/cerberauth/vulnapi/ci.yml?branch=main&label=core%20build&style=for-the-badge)](https://github.com/cerberauth/vulnapi/actions/workflows/ci.yml)
![Latest version](https://img.shields.io/github/v/release/cerberauth/vulnapi?sort=semver&style=for-the-badge)
[![Github Repo Stars](https://img.shields.io/github/stars/cerberauth/vulnapi?style=for-the-badge)](https://github.com/cerberauth/vulnapi)
![License](https://img.shields.io/github/license/cerberauth/vulnapi?style=for-the-badge)

# VulnAPI: An API Security Vulnerability Scanner

VulnAPI is an Open-Source DAST designed to help you scan your APIs for common
security vulnerabilities and weaknesses.

By using this tool, you can detect and mitigate security vulnerabilities in your
APIs before they are exploited by attackers.

<!-- ![Demo](demo.gif) -->

Use this action to scan your project for vulnerabilities with VulnAPI.

## Vulnerabilities Detected

All the vulnerabilities detected by the project are listed at this URL:
[API Vulnerabilities Detected](https://vulnapi.cerberauth.com/docs/vulnerabilities?utm_source=github&utm_medium=readme).

> More vulnerabilities and best practices will be added in future releases. If
> you have any suggestions or requests for additional vulnerabilities or best
> practices to be included, please feel free to open an issue or submit a pull
> request.

## Example usage

### Using OpenAPI

```yaml
name: Scan for API vulnerabilities

on: [push]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: VulnAPI
        uses: cerberauth/vulnapi-action@v2
        with:
          openapi: 'openapi.yaml'
```

### Using cURL

```yaml
name: Scan for API vulnerabilities

on: [push]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: VulnAPI
        uses: cerberauth/vulnapi-action@v2
        with:
          curl: 'curl http://localhost:8080 -H "Authorization: Bearer
            eyJhbGci..."' # gitleaks:allow
```

### Using a configuration file

```yaml
- name: VulnAPI
  uses: cerberauth/vulnapi-action@v2
  with:
    config: 'vulnapi.yaml'
    env: 'staging'
  env:
    USER_TOKEN: ${{ secrets.USER_TOKEN }}
```

Without `curl` or `openapi`, the target of the
[configuration file](https://www.cerberauth.com/docs/vulnapi/reference/configuration-file/)
is scanned. Requires vulnapi 0.12.0 or later.

### Pull request comment

On pull requests, the action posts a comment summarizing every finding (one row
per finding, with full details in a collapsed section) and updates it on later
runs. The step still fails when findings reach the severity threshold.

```yaml
name: Scan for API vulnerabilities

on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: VulnAPI
        uses: cerberauth/vulnapi-action@v2
        with:
          curl: 'curl http://localhost:8080'
          severityThreshold: 7
          # Also keep a SARIF report, e.g. for upload-sarif or as an artifact
          output-format: sarif
```

## Inputs

### General

| Name    | Required | Description                      | Default |
| ------- | -------- | -------------------------------- | ------- |
| version | false    | The version of the file to scan. | latest  |

### cURL Scan Options

| Name | Required | Description | Default |
| ---- | -------- | ----------- | ------- |

<!-- textlint-disable terminology -->

| curl | false | The cURL command to scan. | |

<!-- textlint-enable terminology -->

### OpenAPI Scan Options

| Name | Required | Description | Default |
| ---- | -------- | ----------- | ------- |

<!-- textlint-disable terminology -->

| openapi | false | The OpenAPI file location (path or URL) | |

<!-- textlint-enable terminology -->

### Configuration File Options

| Name   | Required | Description                                     | Default |
| ------ | -------- | ----------------------------------------------- | ------- |
| config | false    | Path to a `vulnapi.yaml` configuration file.    |         |
| env    | false    | Environment of the configuration file to apply. |         |

### VulnAPI Supported Flags

| Name              | Required | Description                                         | Default |
| ----------------- | -------- | --------------------------------------------------- | ------- |
| scans             | false    | The scans performed.                                | `all`   |
| excludeScans      | false    | The scans to exclude.                               |         |
| rateLimit         | false    | The rate limit used to run API vulnerability scans. | `10/s`  |
| proxy             | false    | The proxy server used during the scan.              |         |
| severityThreshold | false    | The severity threshold to trigger a failure.        | `0`     |

### Reports

| Name              | Required | Description                                                                                     | Default             |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------- | ------------------- |
| comment           | false    | Post (or update) a PR comment summarizing every finding. Needs `pull-requests: write`.          | `true`              |
| scan-id           | false    | Keeps a separate PR comment per scan when several scans run on the same PR.                     |                     |
| output-format     | false    | Write the report to a file: `json`, `yaml`, `jsonl`, `sarif`, `markdown`, `html` or `terminal`. |                     |
| output-path       | false    | File path for `output-format`.                                                                  | under `RUNNER_TEMP` |
| report-url        | false    | HTTP endpoint to POST the full report to.                                                       |                     |
| report-format     | false    | Format for `report-url`.                                                                        | `json`              |
| report-headers    | false    | Extra headers for `report-url`, one `Key: Value` per line.                                      |                     |
| show-all-findings | false    | Show every finding in the terminal output.                                                      | `false`             |
| no-color          | false    | Disable ANSI colors in terminal output.                                                         | `false`             |
| quiet             | false    | Suppress the terminal display of the report.                                                    | `false`             |

## Outputs

Scan results are output to the console and, on pull requests, as a PR comment.

| Name        | Description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| report-path | Path of the report file written for `output-format`/`output-path`, if any. |

## Disclaimer

This scanner is provided for informational purposes only. It should not be used
for malicious purposes or to attack any system without proper authorization.
Always respect the security and privacy of others.

## Telemetry

VulnAPI collects fully anonymized usage data to help improve the tool. This data
is not shared with third parties. You can opt-out of telemetry by setting the
`telemetry` option to `false`.

## License

This repository is licensed under the
[MIT License](https://github.com/cerberauth/vulnapi-action/blob/main/LICENSE) @
[CerberAuth](https://www.cerberauth.com/).
