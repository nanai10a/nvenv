const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadFile } = require('./download');
const { extractArchive, findNodeDirectory } = require('./extract');
const { getNodeDownloadInfo, getNodeBinDir, isExecutableFile } = require('./platform');
const { log, warn, isWindows } = require('./utils');

/**
 * Create virtual environment directory structure
 * @param {string} envPath - Path to virtual environment
 */
function createEnvStructure(envPath) {
  const dirs = [
    envPath,
    path.join(envPath, 'bin'),
    path.join(envPath, 'lib')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Create symlink with error handling
 * @param {string} target - Target path
 * @param {string} link - Symlink path
 * @param {object} options - Options { silent: boolean }
 */
function createSymlink(target, link, options = {}) {
  // Remove existing symlink if it exists
  if (fs.existsSync(link)) {
    fs.unlinkSync(link);
  }

  try {
    fs.symlinkSync(target, link);
  } catch (error) {
    // Warn about symlink creation failure
    warn(`Warning: Could not create symlink ${link}: ${error.message}`, options);
    // On Windows or if symlink fails, create a simple wrapper script instead
    let wrapperPath = link;

    // Add extension only if link doesn't already have an executable extension
    if (isWindows()) {
      const ext = path.extname(link).toLowerCase();
      if (!['.exe', '.cmd', '.bat', '.ps1'].includes(ext)) {
        wrapperPath = link + '.cmd';
      }
    }

    const wrapperContent = isWindows()
      ? `@echo off\r\n"${target}" %*`
      : `#!/bin/sh\nexec "${target}" "$@"`;

    fs.writeFileSync(wrapperPath, wrapperContent);
    if (!isWindows()) {
      fs.chmodSync(wrapperPath, 0o755);
    }
  }
}

/**
 * Create symlinks for Node.js binaries
 * @param {string} envPath - Path to virtual environment
 * @param {string} nodePath - Path to extracted Node.js installation
 * @param {object} options - Options { silent: boolean }
 */
function createBinSymlinks(envPath, nodePath, options = {}) {
  const binDir = path.join(envPath, 'bin');
  const nodeBinDir = getNodeBinDir(nodePath);

  if (!fs.existsSync(nodeBinDir)) {
    return;
  }

  const files = fs.readdirSync(nodeBinDir);

  files.forEach(file => {
    const sourcePath = path.join(nodeBinDir, file);

    // Try to stat the file, skip if it doesn't exist or isn't accessible
    let stat;
    try {
      stat = fs.statSync(sourcePath);
    } catch (error) {
      warn(`Warning: Could not access ${file}: ${error.message}`, options);
      return;
    }

    // Skip directories
    if (!stat.isFile()) {
      return;
    }

    // Skip non-executable files (platform-specific filtering)
    if (!isExecutableFile(file, nodeBinDir)) {
      return;
    }

    // Create symlink with original filename (including extension)
    const targetLink = path.join(binDir, file);
    createSymlink(sourcePath, targetLink, options);
    log(`Created symlink: ${file}`, options);
  });
}

/**
 * Generate activate script content
 * @param {string} envPath - Absolute path to virtual environment
 * @param {string} shell - Shell type (bash, fish, powershell)
 * @returns {string} Script content
 */
function generateActivateScript(envPath, shell = 'bash') {
  const binPath = path.join(envPath, 'bin');

  if (shell === 'bash' || shell === 'zsh') {
    return `# This file must be used with "source bin/activate" from bash/zsh
# You cannot run it directly

deactivate () {
    # Reset old environment variables
    if [ -n "\${_OLD_VIRTUAL_PATH:-}" ] ; then
        PATH="\${_OLD_VIRTUAL_PATH:-}"
        export PATH
        unset _OLD_VIRTUAL_PATH
    fi

    if [ -n "\${_OLD_VIRTUAL_PS1:-}" ] ; then
        PS1="\${_OLD_VIRTUAL_PS1:-}"
        export PS1
        unset _OLD_VIRTUAL_PS1
    fi

    # Reset the prompt prefix
    unset NVENV

    # This should detect bash and zsh, which have a hash command that must
    # be called to get it to forget past commands.
    if [ -n "\${BASH:-}" -o -n "\${ZSH_VERSION:-}" ] ; then
        hash -r 2> /dev/null
    fi

    if [ -n "\${_OLD_VIRTUAL_NVENV_PROMPT:-}" ] ; then
        PS1="\${_OLD_VIRTUAL_NVENV_PROMPT:-}"
        export PS1
        unset _OLD_VIRTUAL_NVENV_PROMPT
    fi

    if [ ! "\${1:-}" = "nondestructive" ] ; then
        # Self destruct!
        unset -f deactivate
    fi
}

# Unset irrelevant variables
deactivate nondestructive

NVENV="${envPath}"
export NVENV

_OLD_VIRTUAL_PATH="$PATH"
PATH="${binPath}:$PATH"
export PATH

# Update prompt
_OLD_VIRTUAL_NVENV_PROMPT="$PS1"
if [ "x(nvenv) " != x ] ; then
    PS1="(nvenv) $PS1"
    export PS1
fi

# This should detect bash and zsh, which have a hash command that must
# be called to get it to forget past commands.
if [ -n "\${BASH:-}" -o -n "\${ZSH_VERSION:-}" ] ; then
    hash -r 2> /dev/null
fi
`;
  } else if (shell === 'fish') {
    return `# This file must be used with "source <venv>/bin/activate.fish" from fish
# You cannot run it directly

function deactivate  -d "Exit virtual environment and return to normal shell environment"
    # reset old environment variables
    if test -n "$_OLD_VIRTUAL_PATH"
        set -gx PATH $_OLD_VIRTUAL_PATH
        set -e _OLD_VIRTUAL_PATH
    end

    if test -n "$_OLD_FISH_PROMPT_OVERRIDE"
        functions -e fish_prompt
        set -e _OLD_FISH_PROMPT_OVERRIDE
        functions -c _old_fish_prompt fish_prompt
        functions -e _old_fish_prompt
    end

    set -e NVENV
    if test "$argv[1]" != "nondestructive"
        # Self-destruct!
        functions -e deactivate
    end
end

# Unset irrelevant variables
deactivate nondestructive

set -gx NVENV "${envPath}"

set -gx _OLD_VIRTUAL_PATH $PATH
set -gx PATH "${binPath}" $PATH

# Save the current fish_prompt function
functions -c fish_prompt _old_fish_prompt

# Override fish_prompt
function fish_prompt
    printf "%s(nvenv)%s " (set_color normal) (set_color normal)
    _old_fish_prompt
end

set -gx _OLD_FISH_PROMPT_OVERRIDE "$VIRTUAL_ENV"
`;
  }

  return '';
}

/**
 * Create activate scripts for different shells
 * @param {string} envPath - Path to virtual environment
 * @param {object} options - Options { silent: boolean }
 */
function createActivateScripts(envPath, options = {}) {
  const binDir = path.join(envPath, 'bin');

  // Bash/Zsh activate
  const bashScript = generateActivateScript(envPath, 'bash');
  fs.writeFileSync(path.join(binDir, 'activate'), bashScript);
  log('Created activate script for bash/zsh', options);

  // Fish activate
  const fishScript = generateActivateScript(envPath, 'fish');
  fs.writeFileSync(path.join(binDir, 'activate.fish'), fishScript);
  log('Created activate script for fish', options);
}

/**
 * Save environment metadata
 * @param {string} envPath - Path to virtual environment
 * @param {object} info - Node.js download info
 * @param {object} options - Options { silent: boolean }
 */
function saveMetadata(envPath, info, options = {}) {
  const metadata = {
    version: info.version,
    platform: info.platform,
    arch: info.arch,
    created: new Date().toISOString()
  };

  const metadataPath = path.join(envPath, '.nvenv');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  log('Saved environment metadata', options);
}

/**
 * Create Node.js virtual environment
 * @param {string} version - Node.js version (e.g., "18.16.0")
 * @param {string} envPath - Path where to create the environment
 * @param {object} options - Options { silent: boolean }
 */
async function createEnvironment(version, envPath, options = {}) {
  log(`Creating nvenv environment at: ${envPath}`, options);
  log(`Node.js version: ${version}\n`, options);

  // Get download info
  const downloadInfo = getNodeDownloadInfo(version);
  log(`Platform: ${downloadInfo.platform}-${downloadInfo.arch}`, options);
  log(`Download URL: ${downloadInfo.url}\n`, options);

  // Create environment structure
  createEnvStructure(envPath);

  // Download Node.js
  const tmpDir = os.tmpdir();
  const archivePath = path.join(tmpDir, `${downloadInfo.filename}.${downloadInfo.extension}`);

  await downloadFile(downloadInfo.url, archivePath, options);

  // Extract archive to temp directory
  const extractDir = path.join(tmpDir, `nvenv-extract-${Date.now()}`);
  await extractArchive(archivePath, extractDir, options);

  // Find extracted Node.js directory
  const nodeDir = findNodeDirectory(extractDir);

  // Move to lib directory (cross-device compatible)
  const libPath = path.join(envPath, 'lib', `node-v${downloadInfo.version}`);
  if (fs.existsSync(libPath)) {
    fs.rmSync(libPath, { recursive: true, force: true });
  }

  fs.cpSync(nodeDir, libPath, { recursive: true });
  fs.rmSync(nodeDir, { recursive: true, force: true });
  log(`Installed Node.js to: ${libPath}`, options);

  // Windows: Copy entire Node.js installation to bin/ (Python venv approach)
  // Unix: Create symlinks to executables in lib/
  if (isWindows()) {
    const binDir = path.join(envPath, 'bin');

    // Remove existing bin directory contents (keep directory itself)
    if (fs.existsSync(binDir)) {
      const files = fs.readdirSync(binDir);
      files.forEach(file => {
        const filePath = path.join(binDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Copy all contents from lib/node-vX.X.X to bin/
    const items = fs.readdirSync(libPath);
    items.forEach(item => {
      const srcPath = path.join(libPath, item);
      const destPath = path.join(binDir, item);
      fs.cpSync(srcPath, destPath, { recursive: true });
    });

    log('Copied Node.js installation to bin/ (Windows)', options);
  } else {
    // Unix: Create symlinks
    createBinSymlinks(envPath, libPath, options);
  }

  // Create activate scripts
  createActivateScripts(envPath, options);

  // Save metadata
  saveMetadata(envPath, downloadInfo, options);

  // Cleanup
  fs.unlinkSync(archivePath);
  fs.rmSync(extractDir, { recursive: true, force: true });

  log('\n✓ Environment created successfully!', options);
  log('\nTo activate the environment, run:', options);
  log(`  source ${path.join(envPath, 'bin', 'activate')}`, options);
}

module.exports = {
  createEnvironment,
  createEnvStructure,
  createBinSymlinks,
  createActivateScripts,
  saveMetadata
};
