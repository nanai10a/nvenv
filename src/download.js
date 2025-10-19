#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Download a file from URL to destination with progress indicator
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    // Create destination directory if it doesn't exist
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${destPath}`);

    const file = fs.createWriteStream(destPath);
    let downloadedBytes = 0;
    let totalBytes = 0;

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);

        const redirectUrl = response.headers.location;
        console.log(`Following redirect to: ${redirectUrl}`);

        return downloadFile(redirectUrl, destPath)
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

        if (totalBytes) {
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
        console.log('\nDownload completed!');
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
