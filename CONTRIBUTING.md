# Contributing to Aido

Thanks for your interest in contributing to Aido.

## Getting Started

1. Fork the repo
2. Clone your fork
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Run: `node dist/cli.js --help`

## Development

```bash
# Run in development mode
npm run dev -- sandbox up

# Run tests
npm test

# Lint
npm run lint

# Type check
npm run typecheck
```

## Pull Requests

- Keep changes focused and small
- Add tests for new functionality
- Run `npm test` and `npm run typecheck` before submitting
- Write clear commit messages

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, Node version, Docker version)

## Code Style

- TypeScript strict mode
- No `any` types unless absolutely necessary
- Prefer explicit return types on exported functions

## Scope

Aido is intentionally minimal. Before proposing new features, check the non-goals in the README. If your idea adds scope beyond safe, sandboxed execution, it probably doesn't belong here.
