# Aido — Product Requirements Document

**Version:** 0.1
**Status:** Draft
**Last Updated:** 2026-02-08

---

## Executive Summary

**Aido** is a lightweight, open-source CLI tool that enables safe execution of AI-generated code against real infrastructure. It provides disposable sandboxed environments with scoped permissions, automatic cleanup, and full audit trails.

### Problem Statement

Developers don't trust AI-generated code to run against real infrastructure because:
- Local mocks don't catch real-world issues
- CI/CD is too slow for rapid iteration
- Production is too risky for experimental code
- No safe middle ground exists

### Solution

A simple execution layer that:
- Runs code in isolated, ephemeral sandboxes
- Provides scoped infrastructure access (read-only by default)
- Generates complete audit trails
- Self-destructs automatically
- Requires zero infrastructure to get started

---

## Goals & Non-Goals

### Goals
- ✅ Enable safe execution of AI-generated code
- ✅ Provide simple, composable primitives
- ✅ Generate verifiable evidence for every run
- ✅ Be secure by default
- ✅ Work locally with Docker (day 1)
- ✅ Support cloud sandboxes (future)

### Non-Goals
- ❌ Build an IDE or code editor
- ❌ Create a chat interface
- ❌ Replace CI/CD pipelines
- ❌ Build an autonomous agent framework
- ❌ Offer a hosted service (initially)
- ❌ Support production mutations by default

---

## User Personas

### Primary: AI-Assisted Developer
- Uses AI coding tools (Cursor, Copilot, Claude)
- Wants to test generated code quickly
- Needs confidence before committing changes
- Values fast feedback loops

### Secondary: Platform Engineer
- Builds internal tools for developer productivity
- Needs to provide safe experimentation environments
- Wants audit trails and security guarantees
- May integrate Aido into existing workflows

### Future: AI Agent Developer
- Building autonomous coding agents
- Needs safe execution boundaries
- Wants detailed observability
- Requires reproducible environments

---

## Core Features

### 1. Sandbox Specification (`sandbox.yaml`)

**Purpose:** Declarative config defining execution boundaries

**Required Fields:**
- `name` — sandbox identifier
- `runtime` — execution environment (python, node, etc.)
- `ttl` — time-to-live before auto-destruction
- `inputs` — files/directories to mount (read-only)
- `outputs` — files/directories where results are written
- `permissions` — infrastructure access grants (stub in v0.1)

**Example:**
```yaml
name: test-migration
runtime: python:3.11
ttl: 15m

inputs:
  - scripts/migrate.py
  - config/*.json

outputs:
  - results/
  - migration.log

permissions:
  filesystem: readonly
  network: false
```

### 2. CLI Commands

#### `aido sandbox up`
- Creates new sandbox
- Generates unique ID
- Sets up directory structure
- Returns sandbox ID

#### `aido run <task>`
- Executes task inside sandbox
- Mounts inputs (read-only)
- Captures stdout/stderr
- Records exit code
- Generates artifacts

#### `aido logs [--follow]`
- Shows logs from last or current run
- Supports live streaming with `--follow`

#### `aido sandbox destroy [<id>]`
- Tears down sandbox
- Removes all artifacts
- Frees resources

#### `aido ui` (future)
- Launches terminal UI
- Shows recent runs
- Provides artifact viewer

### 3. Execution Evidence

Every run generates:
- `stdout.log` — standard output
- `stderr.log` — standard error
- `summary.json` — metadata (start time, duration, exit code, etc.)
- `events.log` — structured event log
- File diffs (if in git workspace)

### 4. Safety Guardrails

**Defaults:**
- Inputs are read-only
- No network access
- No host filesystem access
- Automatic TTL enforcement
- Container resource limits

**Escape Hatches:**
- `--dangerous-allow-mutations` flag for write access
- `--network` flag for network access
- Explicit permission grants in `sandbox.yaml`

---

## User Workflows

### Workflow 1: Test AI-Generated Script
```bash
# AI generates migration script
cursor generate migration.py

# Run it safely
aido sandbox up
aido run migration.py

# Review results
aido logs
cat .aido/sandboxes/<id>/outputs/migration.log

# Clean up
aido sandbox destroy
```

### Workflow 2: Replay Production Incident
```bash
# Download logs and configs
aws s3 cp s3://logs/incident-123/ inputs/

# Create sandbox with AWS read access
cat > sandbox.yaml <<EOF
name: incident-replay
runtime: python
ttl: 30m
permissions:
  aws:
    role: readonly
    services: [ec2, rds]
EOF

# Run analysis
aido sandbox up
aido run analyze_incident.py
aido logs > report.txt
```

### Workflow 3: Validate Terraform Changes
```bash
# AI generates terraform changes
# Run validation in sandbox
aido run terraform validate
aido run terraform plan
cat .aido/sandboxes/latest/outputs/plan.out
```

---

## Success Metrics

### Launch (v0.1)
- 10+ developers trying Aido
- 5+ GitHub stars
- Working end-to-end with Docker
- Zero security incidents

### Growth (v0.3)
- 100+ GitHub stars
- 10+ contributors
- 3+ production use cases documented
- Basic cloud sandbox support (AWS/GCP)

### Maturity (v1.0)
- 500+ GitHub stars
- Established security model
- Plugin ecosystem emerging
- Used in production by 10+ teams

---

## Release Criteria

### v0.1 — Local Execution
- ✅ `sandbox.yaml` spec defined
- ✅ CLI skeleton working
- ✅ Docker runtime functional
- ✅ Basic evidence generation
- ✅ Safety defaults enforced
- ✅ Documentation complete

### v0.2 — Enhanced UX
- Terminal UI (`aido ui`)
- Better error messages
- Auto-cleanup of expired sandboxes
- Config validation

### v0.3 — Cloud Sandboxes
- AWS Lambda execution
- GCP Cloud Run support
- Remote artifact storage
- Cross-region execution

---

## Technical Constraints

- Must work offline (no required cloud services)
- Must run on Linux, macOS, Windows (via Docker)
- Must produce human-readable artifacts
- Must be installable via single command
- Must have zero runtime dependencies beyond Docker

---

## Security Considerations

- All execution is isolated by default
- Credentials never stored in artifacts
- Audit logs are tamper-evident
- Network access is opt-in
- Filesystem mutations require explicit flags
- TTL enforcement prevents runaway processes

---

## Open Questions

1. Should we support persistent sandboxes for debugging?
2. How do we handle secrets (env vars, credential files)?
3. What's the right approach for multi-step workflows?
4. Should outputs be encrypted at rest?
5. How do we integrate with existing CI/CD?

---

## References

- `README.md` — Project overview
- `TECH_SPEC.md` — Technical architecture
- `examples/` — Sample configurations and tasks

---

**Mantra:**
Trust comes from constraints.
Autonomy comes later.
