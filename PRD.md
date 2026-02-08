# Aido — Product Requirements Document

## Problem

AI can write code, but developers don't trust it to run against real infrastructure.

- Local mocks don't reflect production.
- CI pipelines are slow and inflexible for iterative AI tasks.
- Running AI code directly in production is reckless.

There is no standard way to let AI-generated code execute safely against real systems with scoped permissions, automatic cleanup, and full auditability.

## Solution

**Aido** is a CLI tool and sandbox specification for running AI-generated code in disposable, constrained environments.

Each task runs inside a **sandbox** — an ephemeral container with:
- Scoped infrastructure permissions
- Read-only inputs
- Captured outputs and logs
- Automatic TTL-based destruction

## Users

- Developers integrating AI into their workflows
- Platform engineers building safe AI execution pipelines
- Security-conscious teams evaluating AI-generated code

## Core Concepts

### Sandbox

A disposable execution environment defined by a YAML spec. Sandboxes are:
- **Isolated** — runs in a container, no host access by default
- **Ephemeral** — destroyed after TTL expires or manually
- **Auditable** — every action is logged with evidence
- **Scoped** — permissions are explicitly declared

### Task

A script or command that runs inside a sandbox. Tasks receive inputs and produce outputs.

### Evidence

Every run produces artifacts:
- `stdout.log` — standard output
- `stderr.log` — standard error
- `summary.json` — metadata (exit code, duration, inputs, outputs)

## CLI Commands

| Command | Description |
|---------|-------------|
| `aido sandbox up` | Create a new sandbox from a spec |
| `aido run <task>` | Execute a task inside the active sandbox |
| `aido logs` | View logs from the latest run |
| `aido sandbox destroy` | Tear down the sandbox and clean up |
| `aido ui` | Launch terminal UI (future) |

## Requirements

### Must Have (v0.1)
- Sandbox spec (YAML schema) with name, runtime, ttl, inputs, outputs
- CLI with working `sandbox up`, `run`, `logs`, `sandbox destroy`
- Docker-based local runtime
- Evidence generation (stdout, stderr, summary)
- TTL enforcement
- Safe defaults (read-only inputs, no host networking)

### Nice to Have
- Terminal UI for browsing runs
- File diff generation for git workspaces
- `--json` output flag for scripting
- `--verbose` flag for debugging

### Non-Goals
- IDE plugins
- Hosted/cloud service
- Autonomous agent loops
- Production mutation by default
- Dashboards or analytics

## Success Criteria

1. A developer can define a sandbox spec in YAML
2. `aido sandbox up && aido run task.py && aido logs` works end-to-end
3. Every run produces inspectable evidence
4. Sandboxes are destroyed automatically after TTL
5. No host mutations without explicit opt-in
