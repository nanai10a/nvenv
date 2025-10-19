# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-20

### Added
- Initial release of nvenv
- Project-local Node.js environment creation with `--node=<version>` flag
- Cross-platform support: macOS (arm64, x64), Linux (x64, arm64), Windows (x64)
- Activation scripts for Bash/Zsh and Fish shells
- Zero dependencies - uses only Node.js standard library
- Automatic Node.js binary download from nodejs.org
- Symlink-based binary access (with fallback to wrapper scripts on Windows)
- Environment metadata tracking in `.nvenv` file
- Python venv-like `activate`/`deactivate` workflow

### Technical Details
- Downloads Node.js from official distribution
- Creates isolated environment in project directory
- No global state or shared cache
- Supports npx usage without global installation

[0.1.0]: https://github.com/nanai10a/nvenv/releases/tag/v0.1.0
