# Changelog

All notable changes to Aido will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial project structure and documentation
- Product Requirements Document (PRD)
- Technical Specification
- Sandbox schema definition (v0.1)
- Example sandbox configurations and tasks
- TypeScript CLI implementation
- Docker runtime adapter
- Sandbox lifecycle management
- Evidence generation (logs, artifacts, summaries)
- Safety guardrails and validation
- Commands: `sandbox up`, `run`, `logs`, `sandbox list`, `sandbox destroy`, `cleanup`
- Comprehensive examples (Python and TypeScript tasks)

---

## [0.1.0] - TBD

### Added
- Core CLI functionality
- Docker-based sandbox execution
- Automatic TTL enforcement
- Evidence generation for all runs
- Safety defaults (read-only, no network)
- Example configurations and tasks

### Security
- Read-only filesystem by default
- Network isolation by default
- Container resource limits
- Non-root execution
- Dropped capabilities

---

## Release Notes

### v0.1.0 - MVP Release

This is the initial release of Aido, providing core functionality for safe execution of AI-generated code.

**Key Features:**
- ✅ Local Docker-based sandboxes
- ✅ Declarative `sandbox.yaml` configuration
- ✅ Automatic cleanup and TTL enforcement
- ✅ Complete audit trails (logs, artifacts, events)
- ✅ Safety-first defaults with explicit escape hatches

**Known Limitations:**
- Docker is required (no cloud runtimes yet)
- Limited to Linux/macOS (Windows via WSL2)
- Cloud permissions (AWS, GCP) are stubs
- No terminal UI yet

**Next Steps:**
- Cloud runtime support (Lambda, Cloud Run)
- Terminal UI implementation
- Enhanced error reporting
- Plugin system

---

For detailed changes and commits, see the [commit history](https://github.com/sgr0691/Aido/commits/main).
