#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Check if silent mode should be enabled
 * @param {object} options - Options object
 * @returns {boolean}
 */
function shouldBeSilent(options = {}) {
  // Explicit option takes precedence
  if (options.silent !== undefined) {
    return options.silent;
  }

  // Check environment variable
  if (process.env.NVENV_SILENT === '1' || process.env.NVENV_SILENT === 'true') {
    return true;
  }

  // Check if running in test mode
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  return false;
}

/**
 * Extract archive file to destination directory
 * @param {string} archivePath - Path to archive file (.tar.gz or .zip)
 * @param {string} destDir - Destination directory
 * @param {object} options - Options { silent: boolean }
 * @returns {Promise<void>}
 */
async function extractArchive(archivePath, destDir, options = {}) {
  const silent = shouldBeSilent(options);

  if (!fs.existsSync(archivePath)) {
    throw new Error(`Archive file not found: ${archivePath}`);
  }

  // Create destination directory
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const ext = path.extname(archivePath);

  if (!silent) {
    console.log(`Extracting archive: ${archivePath}`);
    console.log(`Destination: ${destDir}`);
  }

  try {
    if (ext === '.gz' || archivePath.endsWith('.tar.gz')) {
      // Extract tar.gz using tar command
      execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, {
        stdio: 'inherit'
      });
    } else if (ext === '.zip') {
      // Extract zip using unzip command (Unix) or PowerShell (Windows)
      if (process.platform === 'win32') {
        // Windows: use PowerShell with LiteralPath and Force flags
        execSync(
          `powershell.exe -NoProfile -Command "Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destDir}' -Force"`,
          { stdio: 'inherit' }
        );
      } else {
        // Unix: use unzip
        execSync(`unzip -q "${archivePath}" -d "${destDir}"`, {
          stdio: 'inherit'
        });
      }
    } else {
      throw new Error(`Unsupported archive format: ${ext}`);
    }

    if (!silent) {
      console.log('Extraction completed!');
    }
  } catch (error) {
    throw new Error(`Failed to extract archive: ${error.message}`);
  }
}

/**
 * Find the extracted Node.js directory
 * Handles cases where archive extracts to a subdirectory
 * @param {string} extractDir - Directory where archive was extracted
 * @returns {string} Path to Node.js installation directory
 */
function findNodeDirectory(extractDir) {
  const entries = fs.readdirSync(extractDir);

  // Look for directory matching pattern: node-v*
  const nodeDir = entries.find(entry => {
    const fullPath = path.join(extractDir, entry);
    return fs.statSync(fullPath).isDirectory() && entry.startsWith('node-v');
  });

  if (!nodeDir) {
    throw new Error(`Could not find Node.js directory in ${extractDir}`);
  }

  return path.join(extractDir, nodeDir);
}

module.exports = {
  extractArchive,
  findNodeDirectory
};
