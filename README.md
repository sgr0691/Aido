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

## Installation

### Prerequisites
- **Node.js** 18+
- **Docker** (running and accessible)

### Install from source

```bash
git clone https://github.com/sgr0691/Aido.git
cd Aido
npm install
npm run build
npm link  # Optional: makes 'aido' globally available
```

### Install via npm (coming soon)

```bash
npm install -g aido
```

---

## Quick Start

### 1. Create a sandbox

```bash
aido sandbox up -n my-task -r python:3.11 -t 30m
```

### 2. Run a task

```bash
aido run examples/tasks/hello.py
```

### 3. View the logs

```bash
aido logs
```

### 4. Check the outputs

```bash
ls .aido/sandboxes/*/outputs/
cat .aido/sandboxes/*/outputs/hello.txt
```

### 5. List all sandboxes

```bash
aido sandbox list
```

### 6. Clean up

```bash
aido sandbox destroy
```

### Using a config file

Create `sandbox.yaml`:

```yaml
name: my-analysis
runtime: python:3.11
ttl: 15m

inputs:
  - data/*.json

outputs:
  - results/
  - report.md

permissions:
  filesystem: readonly
  network: false
```

Then run:

```bash
aido sandbox up -f sandbox.yaml
aido run my_script.py
```

---

## Examples

Check out the [`examples/`](examples/) directory for:
- Sample sandbox configurations
- Example tasks (Python and TypeScript)
- Common patterns and use cases

---

## Documentation

- [**PRD.md**](PRD.md) — Product requirements and vision
- [**TECH_SPEC.md**](TECH_SPEC.md) — Technical architecture
- [**SANDBOX_SCHEMA.md**](SANDBOX_SCHEMA.md) — Sandbox config reference
- [**DEVELOPMENT.md**](DEVELOPMENT.md) — Development guide
- [**CONTRIBUTING.md**](CONTRIBUTING.md) — How to contribute

---

## Status

**v0.1.0 - MVP Complete** ✅

Core functionality is implemented:
- ✅ Docker-based sandboxes
- ✅ Declarative configuration
- ✅ Automatic TTL enforcement
- ✅ Evidence generation
- ✅ Safety defaults

**What's next:**
- Cloud runtime support (AWS Lambda, GCP Cloud Run)
- Terminal UI
- Enhanced error reporting
- Plugin system

🚧 Early-stage OSS. Interfaces may change.

If this solves a problem for you, contributions and feedback are welcome.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Philosophy

Trust comes from constraints.
Autonomy comes later.

