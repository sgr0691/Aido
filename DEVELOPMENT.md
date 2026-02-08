# Development Guide

This guide explains how to set up, develop, and test Aido locally.

---

## Prerequisites

- **Node.js** 18+ (with npm or pnpm)
- **Docker** (for running sandboxes)
- **Git**

---

## Setup

```bash
# Clone the repository
git clone https://github.com/sgr0691/Aido.git
cd Aido

# Install dependencies
pnpm install
# or
npm install

# Build the project
pnpm build

# Link for local development (optional)
npm link
```

---

## Project Structure

```
aido/
├── src/
│   ├── cli/              # CLI commands and entry point
│   │   ├── commands/     # Individual command implementations
│   │   └── index.ts      # Commander setup
│   ├── core/             # Core business logic
│   │   ├── schema.ts     # Zod schemas and types
│   │   └── sandbox.ts    # Sandbox lifecycle management
│   ├── runtime/          # Runtime adapters
│   │   └── docker.ts     # Docker runtime implementation
│   ├── evidence/         # Evidence generation
│   │   └── generator.ts  # Artifact generation
│   ├── utils/            # Utility functions
│   │   ├── fs.ts         # File system utilities
│   │   ├── logger.ts     # Logging
│   │   └── id.ts         # ID generation
│   └── index.ts          # Main entry point
├── examples/             # Example configs and tasks
├── dist/                 # Compiled output (gitignored)
└── .aido/                # Local workspace (gitignored)
```

---

## Development Workflow

### Build

```bash
# One-time build
pnpm build

# Watch mode (rebuilds on changes)
pnpm dev
```

### Run Locally

After building, you can run Aido directly:

```bash
# Using node
node dist/index.js --help

# If linked with npm link
aido --help
```

### Linting & Formatting

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

---

## Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes**
   - Edit files in `src/`
   - Add tests if applicable
   - Update documentation

3. **Build and test**
   ```bash
   pnpm build
   pnpm typecheck
   pnpm lint
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature
   ```

5. **Open a pull request**

---

## Testing Aido End-to-End

### 1. Create a sandbox

```bash
node dist/index.js sandbox up -n test -r python:3.11 -t 30m
```

### 2. Run a task

```bash
node dist/index.js run examples/tasks/hello.py
```

### 3. View logs

```bash
node dist/index.js logs
```

### 4. List sandboxes

```bash
node dist/index.js sandbox list
```

### 5. Destroy sandbox

```bash
node dist/index.js sandbox destroy
```

---

## Debugging

### Enable verbose logging

```bash
node dist/index.js --verbose run examples/tasks/hello.py
```

### Check Docker containers

```bash
# List running containers
docker ps

# View container logs
docker logs <container-id>

# Inspect container
docker inspect <container-id>
```

### Inspect sandbox state

```bash
# View sandbox metadata
cat .aido/sandboxes/<sandbox-id>/sandbox.json

# View events log
cat .aido/sandboxes/<sandbox-id>/events.log

# View outputs
ls -la .aido/sandboxes/<sandbox-id>/outputs/
```

---

## Adding New Features

### Adding a new CLI command

1. Create command file in `src/cli/commands/`
2. Implement command logic
3. Register in `src/cli/index.ts`
4. Update documentation

### Adding a new runtime

1. Create runtime adapter in `src/runtime/`
2. Implement runtime interface (similar to `docker.ts`)
3. Update `schema.ts` if needed
4. Add tests

### Adding validation

Use Zod schemas in `src/core/schema.ts`:

```typescript
export const mySchema = z.object({
  field: z.string().min(1),
});
```

---

## Common Issues

### Docker not found

```
Error: Docker is not available
```

**Solution:** Ensure Docker is installed and running:
```bash
docker --version
docker ps
```

### Permission denied

```
Error: EACCES: permission denied
```

**Solution:** Check file permissions or run with appropriate privileges.

### Module not found

```
Error: Cannot find module
```

**Solution:** Rebuild the project:
```bash
pnpm build
```

---

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes
4. Create git tag: `git tag v0.1.0`
5. Push: `git push --tags`
6. Build and publish: `npm publish`

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Commander.js](https://github.com/tj/commander.js)
- [Dockerode](https://github.com/apocas/dockerode)
- [Zod](https://zod.dev/)

---

## Getting Help

- Check existing [Issues](https://github.com/sgr0691/Aido/issues)
- Open a [Discussion](https://github.com/sgr0691/Aido/discussions)
- Read the [Contributing Guide](CONTRIBUTING.md)
