#!/usr/bin/env node

/**
 * Platform detection module
 * Detects OS platform and architecture for downloading correct Node.js binaries
 */

/**
 * Get platform string for Node.js download URL
 * @returns {string} Platform string (darwin, linux, win32)
 */
function getPlatform() {
  const platform = process.platform;

  if (platform === 'darwin' || platform === 'linux' || platform === 'win32') {
    return platform;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Get architecture string for Node.js download URL
 * @returns {string} Architecture string (x64, arm64)
 */
function getArch() {
  const arch = process.arch;

  // Map Node.js arch values to download URL values
  const archMap = {
    'x64': 'x64',
    'arm64': 'arm64',
  };

  if (!archMap[arch]) {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return archMap[arch];
}

/**
 * Get file extension for the platform
 * @param {string} platform - Platform string
 * @returns {string} File extension (.tar.gz or .zip)
 */
function getExtension(platform) {
  return platform === 'win32' ? 'zip' : 'tar.gz';
}

/**
 * Build download URL for Node.js binary
 * @param {string} version - Node.js version (e.g., "18.16.0")
 * @returns {object} Download info with url, filename, extension
 */
function getNodeDownloadInfo(version) {
  const platform = getPlatform();
  const arch = getArch();
  const ext = getExtension(platform);

  // Normalize version (remove 'v' prefix if present)
  const normalizedVersion = version.startsWith('v') ? version.slice(1) : version;

  // Map process.platform to Node.js distribution naming
  // Windows uses 'win' not 'win32' in distribution filenames
  const platformMap = {
    'darwin': 'darwin',
    'linux': 'linux',
    'win32': 'win'
  };

  const distPlatform = platformMap[platform];

  const filename = `node-v${normalizedVersion}-${distPlatform}-${arch}`;

  // Support custom mirror via NVENV_MIRROR environment variable
  const baseUrl = process.env.NVENV_MIRROR || 'https://nodejs.org/dist';
  const url = `${baseUrl}/v${normalizedVersion}/${filename}.${ext}`;

  return {
    url,
    filename,
    extension: ext,
    platform,
    arch,
    version: normalizedVersion
  };
}

/**
 * Get the directory where Node.js binaries are located after extraction
 * @param {string} nodePath - Path to extracted Node.js installation
 * @returns {string} Path to bin directory
 */
function getNodeBinDir(nodePath) {
  // Windows: no bin/ subdirectory, executables are in nodePath directly
  // Unix: executables are in nodePath/bin/
  return process.platform === 'win32'
    ? nodePath
    : require('path').join(nodePath, 'bin');
}

/**
 * Get executable file extensions for current platform
 * @returns {string[]} Array of executable extensions (including dot)
 */
function getExecutableExtensions() {
  if (process.platform === 'win32') {
    return ['.exe', '.cmd', '.bat', '.ps1'];
  }
  return []; // Unix has no specific extensions
}

/**
 * Check if a file is executable based on platform conventions
 * @param {string} filename - Name of the file
 * @param {string} binDir - Directory containing the file
 * @returns {boolean} True if file should be treated as executable
 */
function isExecutableFile(filename, binDir) {
  const path = require('path');
  const ext = path.extname(filename).toLowerCase();
  const basename = path.basename(filename, ext);

  if (process.platform === 'win32') {
    // Windows: check for executable extensions
    const execExts = getExecutableExtensions();

    // Include files with executable extensions
    if (execExts.includes(ext)) {
      return true;
    }

    // Include extension-less files if corresponding .cmd exists
    // (POSIX scripts for Git Bash, WSL, etc.)
    if (!ext) {
      const fs = require('fs');
      return fs.existsSync(path.join(binDir, basename + '.cmd'));
    }

    return false;
  }

  // Unix: all files in bin/ are potentially executable
  return true;
}

module.exports = {
  getPlatform,
  getArch,
  getExtension,
  getNodeDownloadInfo,
  getNodeBinDir,
  getExecutableExtensions,
  isExecutableFile
};
