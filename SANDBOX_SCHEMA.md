# Sandbox Configuration Schema

**Version:** 0.1
**Format:** YAML

---

## Overview

The `sandbox.yaml` file defines the execution environment and security boundaries for Aido tasks. It is optional but recommended for any non-trivial workflow.

---

## Schema Definition

### Required Fields

#### `name`
- **Type:** `string`
- **Description:** Human-readable identifier for the sandbox
- **Example:** `"test-migration"`, `"incident-analysis"`

#### `runtime`
- **Type:** `string`
- **Description:** Execution environment specification
- **Format:** `<language>:<version>` or `docker://<image>`
- **Examples:**
  - `"python:3.11"`
  - `"node:18"`
  - `"docker://custom-image:latest"`

#### `ttl`
- **Type:** `duration string`
- **Description:** Time-to-live before automatic cleanup
- **Format:** `<number><unit>` where unit is `s`, `m`, or `h`
- **Examples:** `"15m"`, `"2h"`, `"30s"`
- **Minimum:** `1m`
- **Maximum:** `24h`

---

### Optional Fields

#### `inputs`
- **Type:** `array of strings`
- **Description:** Paths to files/directories to mount as read-only
- **Supports:** Glob patterns
- **Default:** `[]`
- **Example:**
  ```yaml
  inputs:
    - scripts/*.py
    - config/database.json
    - logs/**/*.log
  ```

#### `outputs`
- **Type:** `array of strings`
- **Description:** Paths where task can write results
- **Default:** `["outputs/"]`
- **Example:**
  ```yaml
  outputs:
    - results/
    - report.md
    - *.csv
  ```

#### `permissions`
- **Type:** `object`
- **Description:** Infrastructure and resource access grants
- **Default:** Minimal permissions (read-only filesystem, no network)

##### `permissions.filesystem`
- **Type:** `enum`
- **Values:** `readonly` | `readwrite` | `none`
- **Default:** `readonly`

##### `permissions.network`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Allow network access

##### `permissions.aws` (stub in v0.1)
- **Type:** `object`
- **Description:** AWS permissions configuration
- **Fields:**
  - `role`: `readonly` | `readwrite`
  - `services`: Array of AWS service names
- **Example:**
  ```yaml
  permissions:
    aws:
      role: readonly
      services:
        - ec2
        - s3
        - rds
  ```

#### `env`
- **Type:** `object`
- **Description:** Environment variables to set in the sandbox
- **Default:** `{}`
- **Example:**
  ```yaml
  env:
    LOG_LEVEL: debug
    API_ENDPOINT: https://api.example.com
  ```
- **Note:** Secrets should not be hardcoded. Use environment variable interpolation: `$SECRET_KEY`

#### `resources`
- **Type:** `object`
- **Description:** Resource limits for the sandbox
- **Fields:**
  - `cpu`: CPU cores (number or string like `"1.5"`)
  - `memory`: Memory limit (string like `"512M"`, `"2G"`)
  - `timeout`: Maximum execution time (duration string)
- **Defaults:**
  ```yaml
  resources:
    cpu: 1
    memory: 512M
    timeout: 10m
  ```

---

## Complete Example

```yaml
name: database-migration-test
runtime: python:3.11
ttl: 30m

inputs:
  - migrations/*.sql
  - config/database.json
  - scripts/migrate.py

outputs:
  - results/
  - migration.log
  - rollback.sql

permissions:
  filesystem: readonly
  network: true
  aws:
    role: readonly
    services:
      - rds
      - secretsmanager

env:
  ENVIRONMENT: staging
  LOG_LEVEL: info

resources:
  cpu: 2
  memory: 1G
  timeout: 15m
```

---

## Validation Rules

1. **Required fields must be present:** `name`, `runtime`, `ttl`
2. **TTL must be between 1m and 24h**
3. **Runtime must be a valid format**
4. **Paths in inputs/outputs must be relative**
5. **Resource values must be positive numbers**
6. **Timeout cannot exceed TTL**

---

## Future Extensions (Not in v0.1)

- `volumes`: Named volume mounts
- `secrets`: Secret management integration
- `hooks`: Pre/post-run hooks
- `dependencies`: Service dependencies (databases, etc.)
- `matrix`: Parameterized runs
- `cache`: Build cache configuration

---

## Schema Versioning

The schema version is tracked separately from Aido versions:
- Schema v0.1: Initial release
- Future changes will bump schema version
- Aido will support multiple schema versions

---

## See Also

- `examples/sandbox.readonly.yaml` — Minimal readonly example
- `examples/sandbox.mutate.yaml` — Example with write permissions
- `TECH_SPEC.md` — Implementation details
