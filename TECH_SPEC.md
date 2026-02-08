# Aido — Technical Specification

**Version:** 0.1
**Status:** Draft
**Last Updated:** 2026-02-08

---

## Architecture Overview

Aido is a CLI tool that orchestrates sandboxed code execution using container runtimes. It manages sandbox lifecycle, enforces security boundaries, and generates execution evidence.

### Core Components

```
┌─────────────────────────────────────────┐
│           CLI (TypeScript)              │
│  - Command parsing                      │
│  - User interaction                     │
│  - Output formatting                    │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│       Sandbox Manager                   │
│  - Lifecycle management                 │
│  - ID generation                        │
│  - Directory setup                      │
│  - Metadata tracking                    │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│       Runtime Adapter                   │
│  - Docker (v0.1)                        │
│  - Lambda (future)                      │
│  - Cloud Run (future)                   │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│       Evidence Generator                │
│  - Log capture                          │
│  - Artifact collection                  │
│  - Summary generation                   │
└─────────────────────────────────────────┘
```

---

## Technology Stack

### CLI & Orchestration
- **Language:** TypeScript (Node.js 18+)
- **CLI Framework:** `commander` or `yargs`
- **Build Tool:** `tsup` or `esbuild`
- **Package Manager:** `pnpm`

### Runtime (v0.1)
- **Container Engine:** Docker
- **Base Images:** Official language images (python, node, etc.)

### Storage
- **Sandbox State:** Local filesystem (`.aido/` directory)
- **Artifacts:** Local filesystem with JSON metadata
- **Logs:** Plain text files + structured JSON

### Future Considerations
- **Cloud Runtimes:** AWS Lambda, GCP Cloud Run
- **Remote Storage:** S3, GCS for artifacts
- **Observability:** OpenTelemetry integration

---

## Sandbox Lifecycle

### 1. Creation (`aido sandbox up`)

```
User runs: aido sandbox up

1. Generate sandbox ID (nanoid, 12 chars)
2. Create directory structure:
   .aido/
   └── sandboxes/
       └── <sandbox-id>/
           ├── inputs/
           ├── work/
           ├── outputs/
           ├── sandbox.json
           └── events.log

3. Parse sandbox.yaml (if present)
4. Write initial metadata to sandbox.json
5. Return sandbox ID to user
```

**Metadata Format (`sandbox.json`):**
```json
{
  "id": "abc123xyz789",
  "created_at": "2026-02-08T10:30:00Z",
  "status": "created",
  "config": {
    "name": "test-task",
    "runtime": "python:3.11",
    "ttl": "15m",
    "permissions": {}
  },
  "runs": []
}
```

### 2. Execution (`aido run <task>`)

```
User runs: aido run script.py

1. Load active sandbox metadata
2. Validate sandbox is not expired
3. Copy task file to work/
4. Mount inputs (read-only)
5. Start container with:
   - Base image matching runtime
   - Volumes: inputs, work, outputs
   - Resource limits (CPU, memory)
   - Network isolation (default: disabled)
6. Execute task inside container
7. Capture stdout, stderr, exit code
8. Generate artifacts
9. Update sandbox.json with run metadata
10. Return exit code to user
```

**Run Metadata:**
```json
{
  "run_id": "run-001",
  "task": "script.py",
  "started_at": "2026-02-08T10:35:00Z",
  "completed_at": "2026-02-08T10:36:23Z",
  "duration_ms": 83000,
  "exit_code": 0,
  "artifacts": [
    "outputs/stdout.log",
    "outputs/stderr.log",
    "outputs/summary.json"
  ]
}
```

### 3. Inspection (`aido logs`)

```
User runs: aido logs

1. Find latest sandbox
2. Find latest run
3. Read and display stdout.log
4. Optionally show stderr if errors occurred
```

### 4. Cleanup (`aido sandbox destroy`)

```
User runs: aido sandbox destroy

1. Stop any running containers
2. Remove sandbox directory
3. Log destruction event
```

**Auto-cleanup:**
- Background process checks TTLs every minute
- Expired sandboxes are destroyed automatically
- User can disable with `--no-auto-cleanup`

---

## Directory Structure

### Workspace Layout
```
project/
├── sandbox.yaml          # Optional sandbox config
├── tasks/                # User's task files
│   ├── analyze.py
│   └── migrate.ts
└── .aido/                # Aido workspace
    ├── config.json       # Global config
    └── sandboxes/
        ├── abc123xyz789/
        │   ├── inputs/
        │   │   └── (read-only mounts)
        │   ├── work/
        │   │   └── (task execution dir)
        │   ├── outputs/
        │   │   ├── stdout.log
        │   │   ├── stderr.log
        │   │   └── summary.json
        │   ├── sandbox.json
        │   └── events.log
        └── def456uvw012/
            └── ...
```

---

## Sandbox Specification Schema

### `sandbox.yaml` (v0.1)

```yaml
# Required
name: string              # Human-readable sandbox name
runtime: string           # Docker image or runtime identifier
ttl: duration             # Time-to-live (e.g., "15m", "2h")

# Optional
inputs:
  - string                # Paths to mount read-only (glob supported)

outputs:
  - string                # Paths where results are written

permissions:              # Infrastructure access grants
  filesystem: readonly    # readonly | readwrite | none
  network: false          # boolean
  aws:                    # Cloud provider permissions (stub)
    role: readonly
    services:
      - ec2
      - s3

env:                      # Environment variables
  KEY: value

resources:                # Resource limits
  cpu: 1
  memory: 512M
  timeout: 10m
```

### Schema Validation
- Use `ajv` or `zod` for runtime validation
- Fail fast on invalid configs
- Provide helpful error messages

---

## Docker Runtime Implementation

### Container Configuration

**Image Selection:**
- `python:3.11-slim` for Python tasks
- `node:18-alpine` for Node.js tasks
- Custom images supported via `runtime: docker://custom-image`

**Volume Mounts:**
```bash
docker run \
  --rm \
  --network none \
  -v $(pwd)/.aido/sandboxes/<id>/inputs:/inputs:ro \
  -v $(pwd)/.aido/sandboxes/<id>/work:/work \
  -v $(pwd)/.aido/sandboxes/<id>/outputs:/outputs \
  -w /work \
  python:3.11-slim \
  python /work/task.py
```

**Resource Limits:**
```bash
docker run \
  --cpus="1.0" \
  --memory="512m" \
  --pids-limit=100 \
  ...
```

**Security:**
- Run as non-root user inside container
- Drop all capabilities by default
- Use read-only root filesystem where possible
- Enable `--security-opt=no-new-privileges`

---

## Evidence Generation

### Artifacts Created Per Run

1. **stdout.log** — Captured standard output
2. **stderr.log** — Captured standard error
3. **summary.json** — Run metadata
4. **events.log** — Structured event stream (JSONL)

### Event Log Format

```jsonl
{"timestamp":"2026-02-08T10:35:00Z","event":"sandbox_created","sandbox_id":"abc123"}
{"timestamp":"2026-02-08T10:35:01Z","event":"run_started","run_id":"run-001","task":"script.py"}
{"timestamp":"2026-02-08T10:36:23Z","event":"run_completed","run_id":"run-001","exit_code":0}
```

### Git Integration (Optional)
If run inside a git repository:
- Capture pre-run git status
- Generate file diffs for outputs
- Include commit SHA in metadata

---

## Security Model

### Threat Model

**In Scope:**
- Malicious task code
- Resource exhaustion
- Filesystem escape
- Network exfiltration

**Out of Scope (v0.1):**
- Container runtime exploits
- Kernel vulnerabilities
- Hardware attacks

### Security Controls

| Control | Implementation |
|---------|----------------|
| Process isolation | Docker containers |
| Filesystem isolation | Read-only inputs, scoped outputs |
| Network isolation | `--network none` by default |
| Resource limits | CPU, memory, PID limits |
| Time limits | TTL enforcement + timeouts |
| Privilege restrictions | Non-root user, dropped capabilities |

### Escape Hatches

Dangerous operations require explicit flags:
```bash
aido run --dangerous-allow-mutations script.py
aido run --network script.py
aido run --host-filesystem script.py
```

These log warnings and require confirmation.

---

## CLI Implementation

### Command Structure

```
aido [global-options] <command> [command-options]

Global Options:
  --version, -v          Show version
  --help, -h             Show help
  --config <path>        Custom config file
  --json                 Output as JSON
  --verbose              Debug logging

Commands:
  sandbox up             Create new sandbox
  run <task>             Execute task in sandbox
  logs [--follow]        Show logs
  sandbox destroy [id]   Destroy sandbox
  ui                     Launch terminal UI (future)
```

### Output Format

**Human-Readable (default):**
```
✓ Sandbox created: abc123xyz789
⚡ Running task: script.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[task output streams here]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Task completed (exit code: 0)
📦 Artifacts: .aido/sandboxes/abc123xyz789/outputs/
```

**JSON Mode (`--json`):**
```json
{
  "status": "success",
  "sandbox_id": "abc123xyz789",
  "run_id": "run-001",
  "exit_code": 0,
  "duration_ms": 83000,
  "artifacts": [...]
}
```

---

## Testing Strategy

### Unit Tests
- Schema validation
- ID generation
- Path handling
- Config parsing

### Integration Tests
- Full CLI workflow
- Docker interaction
- File I/O
- Log capture

### E2E Tests
- Real task execution
- Multi-run scenarios
- TTL enforcement
- Error handling

### Test Framework
- **Test Runner:** Vitest
- **Assertions:** Built-in + Chai
- **Mocking:** MSW for future API calls

---

## Performance Considerations

### Startup Time
- Target: < 2s from `aido run` to task execution
- Docker image caching critical
- Lazy-load modules where possible

### Resource Usage
- Default limits: 1 CPU, 512MB RAM
- Configurable per sandbox
- Auto-cleanup prevents bloat

### Scalability (Future)
- Parallel sandbox execution
- Remote runtime for large workloads
- Artifact streaming for long-running tasks

---

## Observability

### Logging Levels
- `ERROR` — Critical failures
- `WARN` — Potentially unsafe operations
- `INFO` — Key lifecycle events (default)
- `DEBUG` — Detailed execution info

### Metrics (Future)
- Sandbox creation rate
- Task success rate
- Average execution time
- Resource utilization

### Tracing (Future)
- OpenTelemetry integration
- Distributed tracing for cloud runtimes

---

## Extensibility

### Plugin System (Future)

Allow users to add:
- Custom runtimes
- Pre/post-run hooks
- Custom evidence generators
- Integration with external tools

**Example:**
```typescript
// ~/.aido/plugins/slack-notify.ts
export default {
  name: 'slack-notify',
  onRunComplete: async (run) => {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({ text: `Run ${run.id} completed` })
    });
  }
};
```

---

## Migration Path

### From Docker Scripts
- Import existing Dockerfiles
- Convert `docker run` commands to `sandbox.yaml`

### To Cloud Runtimes
- Same CLI interface
- Backend swap from Docker to Lambda/Cloud Run
- Artifacts stored in S3/GCS

---

## Dependencies

### Core
- `commander` or `yargs` — CLI framework
- `dockerode` — Docker API client
- `zod` — Schema validation
- `yaml` — Config parsing
- `nanoid` — ID generation

### Dev
- `typescript` — Language
- `vitest` — Testing
- `tsup` — Bundling
- `prettier` — Formatting
- `eslint` — Linting

---

## Build & Release

### Build Process
```bash
pnpm install
pnpm build          # tsup -> dist/
pnpm test
pnpm run package    # Create standalone binary
```

### Distribution
- **npm:** `npm install -g aido`
- **Homebrew:** `brew install aido` (future)
- **Binary:** GitHub releases

### Versioning
- Semantic versioning (semver)
- Breaking changes increment major version
- Alpha releases: `0.x.y`

---

## Open Technical Questions

1. Should we support Docker Compose for multi-container sandboxes?
2. How do we handle large inputs/outputs (streaming)?
3. Should sandboxes persist across machine restarts?
4. What's the right abstraction for cloud runtime adapters?
5. How do we securely pass credentials to sandboxes?

---

## References

- Docker SDK: https://github.com/apocas/dockerode
- Container security: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- CLI best practices: https://clig.dev/

---

**Principle:**
Simple primitives, composed well.
