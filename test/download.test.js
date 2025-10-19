const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { downloadFile } = require('../src/download.js');

describe('download module', () => {
  const testDir = path.join(__dirname, '.test-downloads');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('downloadFile', () => {
    it('should download a small file successfully', async () => {
      // Use a small file from nodejs.org for testing
      const url = 'https://nodejs.org/dist/index.json';
      const destPath = path.join(testDir, 'index.json');

      await downloadFile(url, destPath);

      assert.ok(fs.existsSync(destPath));
      const stats = fs.statSync(destPath);
      assert.ok(stats.size > 0);
    });

    it('should create destination directory if it does not exist', async () => {
      const url = 'https://nodejs.org/dist/index.json';
      const nestedDir = path.join(testDir, 'nested', 'dir');
      const destPath = path.join(nestedDir, 'test.json');

      await downloadFile(url, destPath);

      assert.ok(fs.existsSync(nestedDir));
      assert.ok(fs.existsSync(destPath));
    });

    it('should handle redirects', async () => {
      // nodejs.org URLs sometimes redirect
      const url = 'https://nodejs.org/dist/latest/SHASUMS256.txt';
      const destPath = path.join(testDir, 'shasums.txt');

      await downloadFile(url, destPath);

      assert.ok(fs.existsSync(destPath));
      const stats = fs.statSync(destPath);
      assert.ok(stats.size > 0);
    });

    it('should reject on invalid URL', async () => {
      const url = 'https://nodejs.org/dist/invalid-file-that-does-not-exist.tar.gz';
      const destPath = path.join(testDir, 'invalid.tar.gz');

      await assert.rejects(
        async () => {
          await downloadFile(url, destPath);
        },
        {
          message: /Failed to download: HTTP 404/
        }
      );

      // File should be cleaned up on error
      assert.ok(!fs.existsSync(destPath));
    });

    it('should clean up partial downloads on error', async () => {
      const url = 'https://invalid-domain-that-does-not-exist.nodejs.org/file.tar.gz';
      const destPath = path.join(testDir, 'partial.tar.gz');

      await assert.rejects(async () => {
        await downloadFile(url, destPath);
      });

      // Partial file should be deleted
      assert.ok(!fs.existsSync(destPath));
    });
  });
});
