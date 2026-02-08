# Contributing to Aido

Thanks for considering contributing to Aido. This document outlines the process for contributing and how to get started.

---

## How Can I Contribute?

### Reporting Bugs

If you find a bug:
1. Check if it's already reported in [Issues](https://github.com/sgr0691/Aido/issues)
2. If not, open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Docker version, Aido version)
   - Relevant logs or error messages

### Suggesting Features

Feature requests are welcome. Before suggesting:
1. Check existing issues and discussions
2. Ensure it aligns with Aido's philosophy (constraints over features)
3. Open an issue with:
   - Use case description
   - Why existing features don't solve it
   - Proposed solution (optional)

### Code Contributions

We welcome pull requests for:
- Bug fixes
- Documentation improvements
- Test coverage
- Performance improvements
- New features (discuss in an issue first)

---

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Docker (for testing)
- Git

### Getting Started

```bash
# Clone the repo
git clone https://github.com/sgr0691/Aido.git
cd Aido

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Run locally
node dist/index.js --help
```

---

## Pull Request Process

1. **Fork the repository** and create your branch from `main`
   ```bash
   git checkout -b fix/your-bug-fix
   # or
   git checkout -b feature/your-feature
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Add tests for new functionality
   - Update documentation if needed
   - Ensure all tests pass

3. **Test your changes**
   ```bash
   pnpm test
   pnpm run lint
   pnpm run typecheck
   ```

4. **Submit the PR**
   - Fill out the PR template
   - Link related issues
   - Describe what changed and why
   - Add screenshots/examples if relevant

5. **Code review**
   - Respond to feedback promptly
   - Make requested changes
   - Keep commits clean and focused

---

## Code Style

- Use TypeScript for all code
- Follow existing code style
- Run `pnpm run format` before committing
- Ensure `pnpm run lint` passes

### Conventions
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Prefer readability over cleverness

---

## Testing

- Write tests for new features
- Maintain or improve test coverage
- Use meaningful test descriptions
- Test both success and failure cases

### Running Tests
```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

---

## Documentation

When adding features:
- Update relevant markdown docs
- Add examples where helpful
- Update CLI help text
- Consider adding to FAQ

---

## Philosophy

Aido has strong opinions:

### Do
- ✅ Keep it simple
- ✅ Prioritize safety
- ✅ Generate evidence
- ✅ Stay composable
- ✅ Fail explicitly

### Don't
- ❌ Add unnecessary features
- ❌ Build platform abstractions
- ❌ Hide complexity
- ❌ Break user trust
- ❌ Compromise security for convenience

When in doubt, ask: "Does this help developers trust AI-generated code?"

---

## Release Process

Maintainers handle releases:
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Publish to npm
5. Create GitHub release

---

## Getting Help

- Open a [Discussion](https://github.com/sgr0691/Aido/discussions) for questions
- Join the community (if/when it exists)
- Check existing docs and issues first

---

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Remember:**
Trust comes from constraints.
Your contributions should reinforce that principle.
