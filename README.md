<p align="center">
    <img src="https://vulnapi.cerberauth.com/logo-ascii-text-art.png" height="150" alt="vulnapi logo">
</p>

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

```yaml
name: VulnAPI

on: [push]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: VulnAPI
        uses: cerberauth/vulnapi-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          curl:
            'curl http://localhost:8080 -H "Authorization: Bearer eyJhbGci..."'
```

## Inputs

### General

| Name    | Required | Description                      | Default |
| ------- | -------- | -------------------------------- | ------- |
| version | false    | The version of the file to scan. | latest  |

### Curl Scan Options

| Name | Required | Description               | Default |
| ---- | -------- | ------------------------- | ------- |
| curl | false    | The curl command to scan. |         |

### OpenAPI Scan Options

| Name    | Required | Description                             | Default |
| ------- | -------- | --------------------------------------- | ------- |
| openapi | false    | The OpenAPI file location (path or URL) |         |

## Outputs

Scan results are output to the console.

## Disclaimer

This scanner is provided for educational and informational purposes only. It
should not be used for malicious purposes or to attack any system without proper
authorization. Always respect the security and privacy of others.

## License

This repository is licensed under the
[MIT License](https://github.com/cerberauth/vulnapi-action/blob/main/LICENSE) @
[CerberAuth](https://www.cerberauth.com/).
