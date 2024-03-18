# VulnAPI GitHub Action

Use this action to scan your project for vulnerabilities using the VulnAPI.

Find out more about the VulnAPI project at
[https://github.com/cerberauth/vulnapi](https://github.com/cerberauth/vulnapi).

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

| Name         | Required | Description               | Default |
| ------------ | -------- | ------------------------- | ------- |
| curl_command | true     | The curl command to scan. |         |

### OpenAPI Scan Options

| Name        | Required | Description      | Default |
| ----------- | -------- | ---------------- | ------- |
| openapi_url | true     | The URL to scan. |         |

## Outputs

No outputs.

## License

This project is licensed under the [MIT License](./LICENSE).
