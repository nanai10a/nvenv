# CLAUDE.md - Context for AI Assistants

This document contains technical context and design decisions for AI assistants working on this project.

## Project Overview

**nvenv** is a Node.js virtual environment manager inspired by Python's venv. It creates project-local Node.js installations without global environment pollution, following Gradle's philosophy of project-local dependency management.

## Design Philosophy

### Core Principles

1. **Project-local installation**: Each environment is completely isolated within the project directory
2. **No global state**: Unlike nvm/asdf/mise, no shared cache or global version registry
3. **Zero dependencies**: Uses only Node.js standard library (https, fs, path, child_process)
4. **Storage redundancy is acceptable**: Disk space trade-off for complete isolation
5. **Python venv-like UX**: Familiar activate/deactivate workflow

### Why Not Global Version Managers?

Traditional tools (nvm, asdf, mise, volta) manage Node.js versions globally:
- Shared state across projects leads to version conflicts
- Implicit dependencies on global environment
- Difficult to reproduce exact environment on different machines

nvenv solves this by treating Node.js like project dependencies (similar to node_modules).

## Architecture

### Module Dependency Graph

```
cli.js (entry point)
  └─> env.js (orchestration)
        ├─> platform.js (detect OS/arch, build URLs)
        ├─> download.js (fetch Node.js binaries)
        └─> extract.js (unpack archives)
```

### Module Responsibilities

#### `src/platform.js`
- Detects `process.platform` and `process.arch`
- Maps to Node.js download URL conventions
- Supported: darwin/linux/win32 on x64/arm64
- Returns download info: `{ url, filename, extension, platform, arch, version }`

**Key implementation detail**: Version normalization removes 'v' prefix if present.

#### `src/download.js`
- HTTPS download with progress indicator
- Handles 301/302 redirects automatically
- Progress display: percentage, downloaded MB, total MB
- Atomic operations: deletes partially downloaded files on error
- Uses Node.js core `https` module (no axios/got)

**Key implementation detail**: Follows redirects recursively, essential for nodejs.org CDN.

#### `src/extract.js`
- Platform-specific extraction:
  - Unix: `tar -xzf` for .tar.gz
  - Windows: PowerShell `Expand-Archive` for .zip
  - Fallback: `unzip` command on Unix
- Locates extracted directory (pattern: `node-v*`)
- Uses `execSync` for synchronous execution

**Key implementation detail**: Archive extracts to subdirectory; `findNodeDirectory()` locates it.

#### `src/env.js`
- Orchestrates complete environment creation
- Directory structure:
  ```
  venv/
  ├── bin/          # Symlinks and activate scripts
  ├── lib/          # Actual Node.js installation
  └── .nvenv        # Metadata JSON
  ```
- Creates symlinks for: node, npm, npx
- Generates activate scripts for bash/zsh and fish
- Saves metadata: version, platform, arch, creation timestamp

**Key implementation detail**: On Windows or if symlinks fail, creates wrapper scripts instead.

#### `src/cli.js`
- Argument parsing: `--node=<version> <path>`
- Help message with `-h` or `--help`
- Error handling and user-friendly output
- Executable via shebang: `#!/usr/bin/env node`

### Activate Scripts

Generated scripts modify shell environment:

**Bash/Zsh** (`bin/activate`):
- Prepends `venv/bin` to `$PATH`
- Saves original `$PATH` in `$_OLD_VIRTUAL_PATH`
- Updates `$PS1` prompt with `(nvenv)` prefix
- Defines `deactivate()` function to restore environment

**Fish** (`bin/activate.fish`):
- Sets `PATH` prepending `venv/bin`
- Overrides `fish_prompt` function
- Defines `deactivate` function

**Critical**: Scripts must be sourced (`source venv/bin/activate`), not executed directly.

## Implementation Details

### Node.js Download URLs

Pattern: `https://nodejs.org/dist/v{version}/node-v{version}-{platform}-{arch}.{ext}`

Examples:
- macOS ARM64: `node-v18.20.0-darwin-arm64.tar.gz`
- Linux x64: `node-v18.20.0-linux-x64.tar.gz`
- Windows x64: `node-v18.20.0-win32-x64.zip`

### Symlink Strategy

Symlinks point to versioned installation:
```
bin/node -> ../lib/node-v18.20.0/bin/node
```

Benefits:
- Multiple versions can coexist in `lib/`
- Future enhancement: switch versions by updating symlinks
- Absolute paths stored in symlinks (not relative) for reliability

### Metadata Format

`.nvenv` JSON structure:
```json
{
  "version": "18.20.0",
  "platform": "darwin",
  "arch": "arm64",
  "created": "2025-10-19T18:00:10.822Z"
}
```

Purpose: Future features like version upgrades, environment inspection.

## Known Limitations

1. **No Windows PowerShell activate script**: Only bash/zsh/fish supported
2. **No version caching**: Each environment downloads Node.js independently
3. **No .nvmrc support**: Version must be specified via `--node=`
4. **No npm version control**: Uses npm bundled with Node.js
5. **No environment migration**: Cannot upgrade existing environment to new Node.js version

## Future Enhancement Considerations

### If Adding Global Cache

Trade-offs:
- **Pro**: Reduces disk usage, faster environment creation
- **Con**: Violates "no global state" principle
- **Implementation**: Store in `~/.cache/nvenv/{version}-{platform}-{arch}/`
- **Symlink strategy**: Link from `venv/lib/` to cache

### If Adding .nvmrc Support

```javascript
function readVersionFromNvmrc() {
  const nvmrcPath = path.join(process.cwd(), '.nvmrc');
  if (fs.existsSync(nvmrcPath)) {
    return fs.readFileSync(nvmrcPath, 'utf8').trim();
  }
  return null;
}
```

Fallback order: `--node=` flag > `.nvmrc` > error

### If Adding npm/pnpm/yarn Version Control

Download from:
- npm: `https://registry.npmjs.org/npm/-/npm-{version}.tgz`
- pnpm: `https://github.com/pnpm/pnpm/releases/download/v{version}/pnpm-{platform}-{arch}`
- yarn: `https://github.com/yarnpkg/yarn/releases/download/v{version}/yarn-v{version}.tar.gz`

Install to `venv/lib/` and update symlinks.

### If Adding Windows PowerShell Support

Template for `bin/activate.ps1`:
```powershell
$env:_OLD_VIRTUAL_PATH = $env:PATH
$env:PATH = "$PSScriptRoot;$env:PATH"
$env:NVENV = (Get-Item $PSScriptRoot).Parent.FullName

function deactivate {
    $env:PATH = $env:_OLD_VIRTUAL_PATH
    Remove-Item Env:_OLD_VIRTUAL_PATH
    Remove-Item Env:NVENV
}
```

## Testing Strategy

### Manual Testing Checklist

1. **Environment creation**:
   - `npx nvenv --node=18.20.0 test-env`
   - Verify directory structure created
   - Check symlinks point to correct binaries

2. **Activation**:
   - `source test-env/bin/activate`
   - Verify `which node` points to `test-env/bin/node`
   - Verify `node --version` matches requested version
   - Verify prompt shows `(nvenv)`

3. **Usage**:
   - `npm install express`
   - Verify packages install to `test-env/` not global

4. **Deactivation**:
   - `deactivate`
   - Verify `which node` returns to system node
   - Verify prompt restored

5. **Multiple environments**:
   - Create two environments with different versions
   - Activate each, verify correct version

### Edge Cases to Test

- Invalid version number → should fail with clear error
- Network failure during download → should clean up partial download
- Insufficient disk space → should fail gracefully
- Environment path already exists → should error or prompt
- Non-existent Node.js version → nodejs.org returns 404

## Code Style and Conventions

### Error Handling

Always throw descriptive errors:
```javascript
throw new Error(`Unsupported platform: ${platform}`);
```

Never silent failures. User should understand what went wrong.

### Async/Await

Use async/await for clarity:
```javascript
async function createEnvironment(version, envPath) {
  await downloadFile(url, archivePath);
  await extractArchive(archivePath, extractDir);
  // ...
}
```

### File Operations

Use synchronous fs for simplicity:
```javascript
fs.mkdirSync(dir, { recursive: true });
```

Only download.js uses async (network I/O).

### Console Output

User-facing messages:
- Progress: `\r` for overwrite (download progress)
- Completion: `\n` for new line
- Errors: `console.error()` with prefix "Error:"
- Success: `✓` checkmark for visual confirmation

## Dependencies

**Production**: NONE (zero dependencies)

**Runtime Requirements**:
- Node.js >= 18.0.0 (specified in package.json engines)
- Unix: `tar` command for extraction
- Windows: PowerShell for zip extraction

**System Dependencies**:
- git (for development)
- chmod (Unix, for setting executable permissions)

## NPM Package Publishing

Before publishing:
1. Test with `npm pack` to verify included files
2. Check `.npmignore` excludes test files and perplexity-report.md
3. Verify `bin` entry points to `src/cli.js`
4. Ensure `chmod +x src/cli.js` for Unix executable

Publish command:
```bash
npm publish
```

## Security Considerations

1. **HTTPS only**: All downloads over HTTPS (nodejs.org)
2. **No arbitrary code execution**: No eval(), no dynamic requires
3. **Temp file cleanup**: Always delete downloaded archives after extraction
4. **Symlink safety**: Check symlink targets exist before creating
5. **Path traversal**: Use `path.join()` and `path.resolve()` to prevent

## Performance Characteristics

- **Download**: ~40MB for typical Node.js binary (darwin-arm64)
- **Extraction**: ~2-5 seconds depending on disk I/O
- **Total time**: ~30-60 seconds on good network connection
- **Disk usage**: ~50-60MB per environment (full Node.js installation)

## Debugging Tips

### Enable verbose logging

Add to modules:
```javascript
const DEBUG = process.env.DEBUG === 'nvenv';
if (DEBUG) console.log('Debug info:', ...);
```

Usage:
```bash
DEBUG=nvenv npx nvenv --node=18.20.0 venv
```

### Check downloaded archive

Downloaded to `/tmp/node-v{version}-{platform}-{arch}.{ext}`

Verify manually:
```bash
ls -lh /tmp/node-v*.tar.gz
tar -tzf /tmp/node-v18.20.0-darwin-arm64.tar.gz | head
```

### Inspect symlinks

```bash
ls -la venv/bin/
file venv/bin/node  # Should show: symbolic link to ...
```

### Test activate script

```bash
bash -x venv/bin/activate  # Debug mode
```

## Common Issues and Solutions

### "tar: command not found" on minimal systems

Install tar:
- Alpine Linux: `apk add tar`
- Debian/Ubuntu: `apt install tar`

### Symlink creation fails on Windows

Falls back to wrapper scripts. Verify:
```cmd
type venv\bin\node.cmd
```

### "Permission denied" when creating environment

Ensure write permissions:
```bash
chmod -R u+w .
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Create Node.js environment
  run: npx nvenv --node=18.20.0 venv

- name: Run tests
  run: |
    source venv/bin/activate
    npm install
    npm test
```

### Docker Example

```dockerfile
RUN npx nvenv --node=18.20.0 /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN npm install
```

## Version History Context

- v0.1.0 (initial): Basic functionality with bash/zsh/fish support
- Future versions should maintain backward compatibility with .nvenv metadata format

## Related Projects and Inspirations

- **Python venv**: Inspiration for activate/deactivate workflow
- **Gradle**: Inspiration for project-local dependencies
- **nodeenv**: Python-based Node.js environment tool (requires Python installation)
- **nve**: Temporary execution in specific Node version (doesn't create persistent environment)
- **npm node package**: npm package containing Node.js binary (similar approach but different UX)

## When to Use vs. Alternatives

**Use nvenv when**:
- Complete project isolation required
- Reproducible environments across machines
- No global state acceptable
- Python venv-like workflow preferred

**Use nvm/asdf/mise when**:
- Multiple projects share same Node.js versions
- Disk space is constrained
- Global version switching needed
- Shell integration preferred over activation

## Maintenance Notes

### Updating for New Node.js Release Patterns

If nodejs.org changes URL structure, update `src/platform.js`:
```javascript
const url = `https://nodejs.org/dist/v${normalizedVersion}/${filename}.${ext}`;
```

### Adding New Platform Support

1. Add to `getPlatform()` and `getArch()` in platform.js
2. Update `getExtension()` if different archive format
3. Update extract.js if new extraction method needed
4. Test on target platform

### Handling Breaking Changes

If making breaking changes:
- Bump major version (semantic versioning)
- Document migration path in CHANGELOG.md
- Consider backward compatibility for .nvenv format
- Provide migration script if possible

---

**Last Updated**: 2025-10-20 by Claude Sonnet 4.5
**Generated With**: Claude Code (claude-sonnet-4-5-20250929)
