# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-rc.1] - 2025-10-23

### Added
- Project-local Node.js environment creation with `--node=<version>` flag
- Cross-platform support: macOS (arm64, x64), Linux (x64, arm64), Windows (x64)
- Activation scripts for Bash/Zsh and Fish shells
- Zero dependencies - uses only Node.js standard library
- Automatic Node.js binary download from nodejs.org
- Silent mode (`--silent` flag and `NVENV_SILENT` environment variable)
- Custom mirror support via `NVENV_MIRROR` environment variable
- ESLint and @stylistic/eslint-plugin for code quality enforcement
- Comprehensive test suite with unit and integration tests
- GitHub Actions CI/CD workflows with automated testing and linting
- Python venv-like `activate`/`deactivate` workflow

[0.1.0-rc.1]: https://github.com/nanai10a/nvenv/releases/tag/0.1.0-rc.1
