# Aido Examples

This directory contains example sandbox configurations and tasks to help you get started with Aido.

---

## Sandbox Configurations

### `sandbox.readonly.yaml`
A minimal read-only sandbox configuration for tasks that only need to analyze or inspect data.

**Use cases:**
- Log analysis
- Data inspection
- Report generation
- Code review

**Run:**
```bash
aido sandbox up -f sandbox.readonly.yaml
aido run tasks/analyze_logs.py
```

---

### `sandbox.mutate.yaml`
A sandbox configuration with write permissions for tasks that need to modify files.

**⚠️ CAUTION:** Requires `--dangerous-allow-mutations` flag

**Use cases:**
- File transformation
- Code generation
- Build processes
- Data migration

**Run:**
```bash
aido sandbox up -f sandbox.mutate.yaml
aido run tasks/transform.ts --dangerous-allow-mutations
```

---

### `sandbox.cloud.yaml`
A cloud-aware sandbox configuration for tasks that interact with AWS infrastructure.

**Note:** Cloud permissions are a stub in v0.1 and not yet functional.

**Use cases:**
- Infrastructure checks
- Resource auditing
- Configuration validation
- Cost analysis

---

## Example Tasks

### `tasks/hello.py`
A simple Python "Hello World" task that demonstrates:
- Reading from inputs (if available)
- Writing to outputs
- Logging to stdout
- Basic file operations

**Run:**
```bash
aido sandbox up
aido run examples/tasks/hello.py
aido logs
cat .aido/sandboxes/latest/outputs/hello.txt
```

---

### `tasks/hello.ts`
A Node.js/TypeScript version of the Hello World task.

**Run:**
```bash
aido sandbox up -f examples/sandbox.mutate.yaml
aido run examples/tasks/hello.ts
```

---

### `tasks/analyze_logs.py`
A more realistic example that:
- Reads multiple log files from inputs
- Analyzes log levels and errors
- Generates JSON and Markdown reports
- Writes multiple outputs

**Try it:**
```bash
# Create sample log files
mkdir -p inputs
echo "[INFO] Application started" > inputs/app.log
echo "[ERROR] Database connection failed" >> inputs/app.log
echo "[WARN] Memory usage high" >> inputs/app.log

# Run analysis
aido sandbox up -f examples/sandbox.readonly.yaml
aido run examples/tasks/analyze_logs.py

# View results
cat .aido/sandboxes/latest/outputs/report.md
cat .aido/sandboxes/latest/outputs/analysis.json
```

---

## Creating Your Own Tasks

### Basic Task Template (Python)

```python
#!/usr/bin/env python3
import sys
from pathlib import Path

def main():
    # Read inputs
    inputs_dir = Path("/inputs")
    # ... process inputs ...

    # Write outputs
    outputs_dir = Path("/outputs")
    outputs_dir.mkdir(exist_ok=True)

    output_file = outputs_dir / "result.txt"
    output_file.write_text("Task complete!")

    print("✓ Task completed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

### Basic Task Template (TypeScript/Node)

```typescript
#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function main(): number {
  // Read inputs from /inputs

  // Write outputs
  const outputsDir = '/outputs';
  mkdirSync(outputsDir, { recursive: true });

  writeFileSync(
    join(outputsDir, 'result.txt'),
    'Task complete!',
    'utf-8'
  );

  console.log('✓ Task completed successfully');
  return 0;
}

process.exit(main());
```

---

## Directory Structure in Sandboxes

When your task runs inside a sandbox, it has access to:

```
/inputs/          # Read-only inputs (mounted from your workspace)
/work/            # Working directory (writable, ephemeral)
/outputs/         # Output directory (writable, persisted)
```

**Tips:**
- Always write results to `/outputs/`
- Use `/work/` for temporary files
- Never try to write to `/inputs/` (read-only)

---

## Next Steps

1. Try running the example tasks
2. Modify them to suit your needs
3. Create your own `sandbox.yaml` configurations
4. Build custom tasks for your workflows

---

## Need Help?

- Read `SANDBOX_SCHEMA.md` for full schema documentation
- Check `TECH_SPEC.md` for implementation details
- Open an issue if something's unclear

---

**Remember:**
Trust comes from constraints.
Start with readonly, graduate to mutations.
