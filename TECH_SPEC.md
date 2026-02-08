# Aido — Technical Specification

## Architecture Overview

```
┌─────────────────────────────────────┐
│              CLI (TypeScript)        │
│  commander + sandbox manager + runner│
├─────────────────────────────────────┤
│           Sandbox Manager            │
│  create / destroy / list / enforce   │
├─────────────────────────────────────┤
│           Docker Runtime             │
│  container lifecycle + mount mgmt    │
├─────────────────────────────────────┤
│         Local Filesystem             │
│  .aido/sandboxes/<id>/               │
└─────────────────────────────────────┘
```

## Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Strong typing, good CLI ecosystem |
| CLI framework | Commander | Simple, well-documented, minimal |
| Runtime | Docker (via dockerode) | Ubiquitous, well-understood isolation |
| Config format | YAML | Human-readable, widely adopted |
| ID generation | nanoid | Short, URL-safe, collision-resistant |

## Sandbox Spec Schema (v0.1)

```yaml
# sandbox.yaml
name: string          # required — human-readable name
runtime: string       # required — "python" | "node" | "bash" | docker image
ttl: string           # required — duration ("5m", "1h", "30s")
inputs: string[]      # optional — glob patterns for input files (mounted read-only)
outputs: string[]     # optional — expected output paths
permissions:          # optional — infrastructure access (stub in v0.1)
  aws:
    role: string
    services: string[]
```

### Supported Runtimes (v0.1)

| Runtime value | Docker image |
|---------------|-------------|
| `python` | `python:3.12-slim` |
| `node` | `node:20-slim` |
| `bash` | `ubuntu:22.04` |
| Custom | Any valid Docker image |

## Local Workspace Layout

```
.aido/
├── sandboxes/
│   └── <sandbox-id>/
│       ├── sandbox.yaml      # copy of the spec
│       ├── inputs/           # mounted read-only into container
│       ├── work/             # container working directory
│       ├── outputs/          # captured after execution
│       │   ├── stdout.log
│       │   ├── stderr.log
│       │   └── summary.json
│       ├── run.json          # run metadata
│       └── events.log        # structured event log
```

## CLI Commands — Detailed

### `aido sandbox up [--spec <path>]`

1. Read and validate `sandbox.yaml` (default: `./sandbox.yaml`)
2. Generate sandbox ID via nanoid (8 chars)
3. Create `.aido/sandboxes/<id>/` directory structure
4. Copy input files to `inputs/`
5. Write `run.json` with initial metadata
6. Pull Docker image if needed
7. Print sandbox ID and status

### `aido run <task> [--sandbox <id>]`

1. Resolve sandbox (use latest if no `--sandbox` flag)
2. Validate task file exists
3. Start Docker container:
   - Mount `inputs/` as read-only at `/inputs`
   - Mount `outputs/` at `/outputs`
   - Mount task file at `/task`
   - Set working directory to `/work`
   - Apply resource limits (CPU, memory from spec or defaults)
4. Execute task inside container
5. Capture stdout → `outputs/stdout.log`
6. Capture stderr → `outputs/stderr.log`
7. Record exit code, duration, timestamps → `outputs/summary.json`
8. Update `run.json` with results
9. Append events to `events.log`

### `aido logs [--sandbox <id>] [--follow]`

1. Resolve sandbox
2. Read `outputs/stdout.log` and `outputs/stderr.log`
3. Print to terminal (interleaved or separated)
4. With `--follow`: tail the log files during active runs

### `aido sandbox destroy [--sandbox <id>] [--all]`

1. Resolve sandbox(es)
2. Stop running container if active
3. Remove container
4. Remove `.aido/sandboxes/<id>/` directory
5. Print confirmation

### `aido ui`

Print "Coming soon" message for v0.1.

## Run Metadata (`run.json`)

```json
{
  "id": "abc12def",
  "sandbox": "replay-incident",
  "status": "completed",
  "task": "analyze.py",
  "startedAt": "2026-02-08T10:00:00Z",
  "completedAt": "2026-02-08T10:00:12Z",
  "duration": 12000,
  "exitCode": 0,
  "container": {
    "id": "sha256:...",
    "image": "python:3.12-slim"
  }
}
```

## Summary Output (`summary.json`)

```json
{
  "sandboxId": "abc12def",
  "task": "analyze.py",
  "exitCode": 0,
  "durationMs": 12000,
  "stdout": "outputs/stdout.log",
  "stderr": "outputs/stderr.log",
  "outputFiles": ["report.md"],
  "startedAt": "2026-02-08T10:00:00Z",
  "completedAt": "2026-02-08T10:00:12Z"
}
```

## TTL Enforcement

- TTL is parsed from the sandbox spec (e.g., `"20m"` → 1,200,000ms)
- A timeout is set when the container starts
- If the container exceeds TTL, it is forcefully stopped and destroyed
- The summary records `"status": "timeout"` in this case

## Safety Defaults

| Setting | Default | Override |
|---------|---------|----------|
| Input mount | Read-only | None (always read-only) |
| Host networking | Disabled | `--dangerous-allow-host-network` |
| Host filesystem | No access | None |
| Privileged mode | Disabled | `--dangerous-allow-privileged` |
| Auto-destroy | Enabled (TTL) | `--no-auto-destroy` |

## Error Handling

- Invalid spec → clear validation error with line numbers
- Docker not running → prompt user to start Docker
- Image pull failure → retry once, then fail with message
- Container timeout → force stop, record evidence, report
- Missing task file → error before container start

## Future Considerations (Not in v0.1)

- Remote sandbox backends (cloud VMs, Kubernetes)
- Permission enforcement (AWS IAM role assumption)
- Sandbox networking policies
- Multi-step task pipelines
- Sandbox templates / presets
