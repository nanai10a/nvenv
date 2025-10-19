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

  const filename = `node-v${normalizedVersion}-${platform}-${arch}`;
  const url = `https://nodejs.org/dist/v${normalizedVersion}/${filename}.${ext}`;

  return {
    url,
    filename,
    extension: ext,
    platform,
    arch,
    version: normalizedVersion
  };
}

module.exports = {
  getPlatform,
  getArch,
  getExtension,
  getNodeDownloadInfo
};
