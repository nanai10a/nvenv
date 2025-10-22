# nvenv

**Python venv-like Node.js environment manager** - Create project-local Node.js installations without global environment pollution.

## Overview

`nvenv` is a Node.js environment management tool inspired by Python's `venv`. It follows the Gradle philosophy of project-local installations, ensuring that each project has its own isolated Node.js environment without polluting the global system.

### Key Features

- **Project-local installation**: Each environment is completely isolated
- **No global pollution**: Node.js binaries are downloaded and stored within the project
- **Python venv-like interface**: Familiar `activate`/`deactivate` workflow
- **Zero dependencies**: Uses only Node.js standard library
- **Cross-platform**: Supports macOS, Linux, and Windows
- **npx-ready**: No global installation required

### Philosophy

Unlike tools like `nvm`, `asdf`, or `mise` that manage Node.js versions globally, `nvenv` takes a Gradle-like approach where each project has its own local Node.js installation. This eliminates version conflicts between projects and ensures complete environment isolation.

## Installation

No installation required! Use directly with `npx`:

```bash
npx nvenv --node=18.20.0 venv
```

Or install globally if you prefer:

```bash
npm install -g nvenv
nvenv --node=18.20.0 venv
```

## Usage

### Creating a New Environment

Create a new Node.js environment with a specific version:

```bash
npx nvenv --node=18.20.0 venv
```

This will:
1. Download Node.js v18.20.0 for your platform
2. Extract it to `venv/lib/`
3. Create symlinks in `venv/bin/`
4. Generate activation scripts

### Activating the Environment

**Bash/Zsh:**
```bash
source venv/bin/activate
```

**Fish:**
```fish
source venv/bin/activate.fish
```

After activation, your shell prompt will show `(nvenv)` prefix, and `node`, `npm`, and `npx` commands will use the local installation.

### Using the Environment

Once activated, use Node.js and npm as usual:

```bash
(nvenv) $ node --version
v18.20.0

(nvenv) $ npm install express
(nvenv) $ node app.js
```

### Deactivating the Environment

To return to your system's Node.js:

```bash
(nvenv) $ deactivate
```

## Directory Structure

After creating an environment, you'll have:

```
venv/
├── .nvenv                 # Metadata (version, platform, arch)
├── bin/
│   ├── activate          # Bash/Zsh activation script
│   ├── activate.fish     # Fish activation script
│   ├── node              # Symlink to Node.js binary
│   ├── npm               # Symlink to npm
│   └── npx               # Symlink to npx
└── lib/
    └── node-v18.20.0/    # Full Node.js installation
```

## Examples

### Create environment with specific Node.js version

```bash
# Node.js 18.x
npx nvenv --node=18.20.0 venv

# Node.js 20.x
npx nvenv --node=20.11.0 my-project

# Latest LTS
npx nvenv --node=20.18.0 production
```

### Use in CI/CD

```yaml
# GitHub Actions example
- name: Create Node.js environment
  run: npx nvenv --node=18.20.0 venv

- name: Install dependencies
  run: |
    source venv/bin/activate
    npm install
    npm test
```

### Multiple projects with different Node.js versions

```bash
# Project A uses Node.js 16
cd project-a
npx nvenv --node=16.20.0 venv
source venv/bin/activate
npm install

# Project B uses Node.js 20
cd ../project-b
npx nvenv --node=20.11.0 venv
source venv/bin/activate
npm install
```

## Configuration

### Environment Variables

`nvenv` can be configured using environment variables:

- **`NVENV_SILENT`**: Set to `1` to suppress progress output during environment creation
- **`NVENV_MIRROR`**: Custom mirror URL for Node.js downloads (default: `https://nodejs.org/dist`)

### Using a Custom Mirror

For faster downloads in certain regions, you can use a mirror:

```bash
# China mirror (npmmirror/Taobao)
export NVENV_MIRROR=https://npmmirror.com/mirrors/node
npx nvenv --node=18.20.0 venv

# Or set for a single command
NVENV_MIRROR=https://npmmirror.com/mirrors/node npx nvenv --node=18.20.0 venv
```

**Popular mirrors:**
- China (npmmirror): `https://npmmirror.com/mirrors/node`
- China (Tencent): `https://mirrors.cloud.tencent.com/nodejs-release`
- Europe: Check regional mirrors based on your location

### Silent Mode

Suppress verbose download progress output:

```bash
# Silent mode for CI/CD
NVENV_SILENT=1 npx nvenv --node=18.20.0 venv

# Or use the --silent flag
npx nvenv --silent --node=18.20.0 venv
```

## Comparison with Other Tools

| Feature | nvenv | nvm | asdf | mise | volta |
|---------|-------|-----|------|------|-------|
| Project-local | ✓ | ✗ | ✗ | ✗ | ✗ |
| No global state | ✓ | ✗ | ✗ | ✗ | ✗ |
| Zero config | ✓ | ✗ | ✗ | ✗ | ✗ |
| npx-ready | ✓ | ✗ | ✗ | ✗ | ✗ |
| Python venv-like | ✓ | ✗ | ✗ | ✗ | ✗ |

## Why nvenv?

Traditional Node.js version managers like `nvm` or `asdf` manage versions globally and share them across projects. This can lead to:

- **Version conflicts**: Different projects requiring different Node.js versions
- **Environment pollution**: Global `node_modules` affecting multiple projects
- **Reproducibility issues**: Hard to ensure exact same environment across machines

`nvenv` solves these by giving each project its own isolated Node.js installation, similar to how Gradle downloads dependencies per-project or how Python's `venv` creates isolated Python environments.

## Supported Platforms

- **macOS**: arm64, x64
- **Linux**: x64, arm64
- **Windows**: x64 (experimental)

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/nvenv.git
cd nvenv

# Test locally
node src/cli.js --node=18.20.0 test-env

# Activate test environment
source test-env/bin/activate
```

## FAQ

### Should I commit the venv directory to git?

No. Add it to `.gitignore`:

```gitignore
venv/
```

Users should create their own environment using `npx nvenv`.

### Can I use this with existing projects?

Yes! Just create a new environment in your project directory:

```bash
cd my-existing-project
npx nvenv --node=18.20.0 venv
source venv/bin/activate
npm install
```

### How much disk space does each environment use?

Approximately 40-60MB per environment, depending on the Node.js version and platform. This is the trade-off for complete isolation.

## License

MIT

## Inspiration

- Python's `venv` - Virtual environment concept
- Gradle - Project-local dependency management
- nodeenv - Python-based Node.js environment tool

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Author

Created as a weekend project inspired by the desire for Gradle-like Node.js environment management.
