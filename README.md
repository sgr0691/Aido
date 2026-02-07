# Aido

Run AI-generated code safely against real infrastructure.

## Why this exists

AI can write code.
But most developers don’t trust it to run anywhere real.

Local mocks lie.
CI is slow.
Production is dangerous.

**Aido** is a small, open-source execution layer that lets AI run code
inside disposable, sandboxed environments with scoped infrastructure access.

No dashboards.
No long-running agents.
No production mutations by default.

Just safe execution with evidence.

---

## What Aido is

- A CLI for running AI-executed tasks
- A sandbox spec for defining safe execution boundaries
- An ephemeral runtime with automatic cleanup

Think:
- `docker run`, but for AI tasks
- disposable, inspectable, infra-aware execution

---

## What Aido is not

- ❌ an IDE
- ❌ a chat interface
- ❌ a CI/CD replacement
- ❌ an autonomous agent framework
- ❌ a hosted service

---

## Core concept: the sandbox

Each task runs inside a sandbox defined by a simple spec:

```yaml
name: replay-incident
runtime: python
ttl: 20m

permissions:
  aws:
    role: readonly
    services:
      - ec2
      - rds

inputs:
  - logs/*.json
  - terraform/plan.out

outputs:
  - report.md
  - diffs/
```

Sandboxes are:
- isolated
- ephemeral
- auditable
- destroyed automatically

---

## CLI (minimal by design)

```bash
aido sandbox up
aido run task.py
aido logs
aido sandbox destroy
```

Every run produces:
- commands executed
- logs
- file diffs
- exit status

No “AI said so.”  
Only evidence.

---

## Use cases

- Test AI-generated code against real infra safely
- Replay incidents using real logs and configs
- Validate migrations or scripts before CI
- Let agents act without trusting them blindly

---

## Status

🚧 Early-stage OSS. Interfaces may change.

If this solves a problem for you, contributions and feedback are welcome.

---

## Philosophy

Trust comes from constraints.  
Autonomy comes later.

