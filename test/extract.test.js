const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { extractArchive, findNodeDirectory } = require('../src/extract.js');

describe('extract module', () => {
  const testDir = path.join(__dirname, '.test-extract');

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

  describe('extractArchive', () => {
    it('should extract tar.gz archive', async () => {
      // Create a test tar.gz archive
      const sourceDir = path.join(testDir, 'source');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'test.txt'), 'test content');

      const archivePath = path.join(testDir, 'test.tar.gz');
      const extractDir = path.join(testDir, 'extract');

      // Create tar.gz
      execSync(`tar -czf "${archivePath}" -C "${sourceDir}" .`, { stdio: 'pipe' });

      await extractArchive(archivePath, extractDir);

      assert.ok(fs.existsSync(extractDir));
      assert.ok(fs.existsSync(path.join(extractDir, 'test.txt')));
      const content = fs.readFileSync(path.join(extractDir, 'test.txt'), 'utf8');
      assert.strictEqual(content, 'test content');
    });

    it('should create destination directory if it does not exist', async () => {
      const sourceDir = path.join(testDir, 'source');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'content');

      const archivePath = path.join(testDir, 'test.tar.gz');
      const nestedExtractDir = path.join(testDir, 'nested', 'extract');

      execSync(`tar -czf "${archivePath}" -C "${sourceDir}" .`, { stdio: 'pipe' });

      await extractArchive(archivePath, nestedExtractDir);

      assert.ok(fs.existsSync(nestedExtractDir));
      assert.ok(fs.existsSync(path.join(nestedExtractDir, 'file.txt')));
    });

    it('should throw error if archive file does not exist', async () => {
      const nonExistentArchive = path.join(testDir, 'nonexistent.tar.gz');
      const extractDir = path.join(testDir, 'extract');

      await assert.rejects(
        async () => {
          await extractArchive(nonExistentArchive, extractDir);
        },
        {
          message: /Archive file not found/
        }
      );
    });

    if (process.platform !== 'win32') {
      it('should extract zip archive on Unix', async () => {
        const sourceDir = path.join(testDir, 'source');
        fs.mkdirSync(sourceDir, { recursive: true });
        fs.writeFileSync(path.join(sourceDir, 'test.txt'), 'zip test');

        const archivePath = path.join(testDir, 'test.zip');
        const extractDir = path.join(testDir, 'extract');

        // Create zip using system command
        execSync(`cd "${sourceDir}" && zip -q "${archivePath}" test.txt`, { stdio: 'pipe' });

        await extractArchive(archivePath, extractDir);

        assert.ok(fs.existsSync(extractDir));
        assert.ok(fs.existsSync(path.join(extractDir, 'test.txt')));
      });
    }
  });

  describe('findNodeDirectory', () => {
    it('should find node directory with version prefix', () => {
      const extractDir = path.join(testDir, 'extract');
      fs.mkdirSync(extractDir, { recursive: true });

      // Create a mock node directory
      const nodeDir = path.join(extractDir, 'node-v18.20.0-darwin-arm64');
      fs.mkdirSync(nodeDir);

      const found = findNodeDirectory(extractDir);

      assert.strictEqual(found, nodeDir);
    });

    it('should find correct directory among multiple directories', () => {
      const extractDir = path.join(testDir, 'extract');
      fs.mkdirSync(extractDir, { recursive: true });

      // Create multiple directories
      fs.mkdirSync(path.join(extractDir, 'other-dir'));
      const nodeDir = path.join(extractDir, 'node-v20.11.0-linux-x64');
      fs.mkdirSync(nodeDir);
      fs.mkdirSync(path.join(extractDir, 'another-dir'));

      const found = findNodeDirectory(extractDir);

      assert.strictEqual(found, nodeDir);
    });

    it('should throw error if no node directory found', () => {
      const extractDir = path.join(testDir, 'extract');
      fs.mkdirSync(extractDir, { recursive: true });

      // Create non-node directories
      fs.mkdirSync(path.join(extractDir, 'some-dir'));
      fs.mkdirSync(path.join(extractDir, 'other-dir'));

      assert.throws(
        () => {
          findNodeDirectory(extractDir);
        },
        {
          message: /Could not find Node.js directory/
        }
      );
    });

    it('should ignore files and only check directories', () => {
      const extractDir = path.join(testDir, 'extract');
      fs.mkdirSync(extractDir, { recursive: true });

      // Create a file that matches the pattern (should be ignored)
      fs.writeFileSync(path.join(extractDir, 'node-v18.0.0.txt'), 'not a directory');

      // Create the actual node directory
      const nodeDir = path.join(extractDir, 'node-v18.20.0-darwin-arm64');
      fs.mkdirSync(nodeDir);

      const found = findNodeDirectory(extractDir);

      assert.strictEqual(found, nodeDir);
    });
  });
});
