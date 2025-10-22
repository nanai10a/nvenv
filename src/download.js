#!/usr/bin/env node

const https = require('https');
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
 * Download a file from URL to destination with progress indicator
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination file path
 * @param {object} options - Options { silent: boolean }
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath, options = {}) {
  return new Promise((resolve, reject) => {
    const silent = shouldBeSilent(options);

    // Create destination directory if it doesn't exist
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (!silent) {
      console.log(`Downloading from: ${url}`);
      console.log(`Saving to: ${destPath}`);
    }

    const file = fs.createWriteStream(destPath);
    let downloadedBytes = 0;
    let totalBytes = 0;

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);

        const redirectUrl = response.headers.location;
        if (!silent) {
          console.log(`Following redirect to: ${redirectUrl}`);
        }

        return downloadFile(redirectUrl, destPath, options)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      totalBytes = parseInt(response.headers['content-length'], 10);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;

        if (!silent && totalBytes) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
          const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

          process.stdout.write(
            `\rProgress: ${percent}% (${downloadedMB}MB / ${totalMB}MB)`
          );
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        if (!silent) {
          console.log('\nDownload completed!');
        }
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();

      // Delete partially downloaded file
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }

      reject(err);
    });

    file.on('error', (err) => {
      file.close();

      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }

      reject(err);
    });
  });
}

module.exports = {
  downloadFile
};
