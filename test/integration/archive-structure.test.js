const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { getNodeDownloadInfo } = require('../../src/platform.js');
const { downloadFile } = require('../../src/download.js');
const { extractArchive } = require('../../src/extract.js');

describe('Node.js archive structure', () => {
  const testDir = path.join(__dirname, '.test-archive');

  // Test multiple Node.js versions that are used in CI
  const versions = ['18.20.0', '20.11.0', '22.0.0'];

  after(() => {
    // Cleanup test directory after all tests
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  versions.forEach(version => {
    it(`should have correct structure for v${version} on ${process.platform}-${process.arch}`, { timeout: Number.POSITIVE_INFINITY }, async function () {
      this.timeout = Number.POSITIVE_INFINITY; // Unlimited timeout for downloads

      // Create test directory
      const versionTestDir = path.join(testDir, version);
      if (!fs.existsSync(versionTestDir)) {
        fs.mkdirSync(versionTestDir, { recursive: true });
      }

      // Get download info for current platform
      const downloadInfo = getNodeDownloadInfo(version);

      const archivePath = path.join(versionTestDir, `node.${downloadInfo.extension}`);
      const extractDir = path.join(versionTestDir, 'extracted');

      // Download if not already cached
      if (!fs.existsSync(archivePath)) {
        console.log(`Downloading Node.js ${version} for ${process.platform}-${process.arch}...`);
        await downloadFile(downloadInfo.url, archivePath, { silent: true });
      }

      // Extract
      if (!fs.existsSync(extractDir)) {
        console.log(`Extracting ${process.platform}-${process.arch} archive...`);
        await extractArchive(archivePath, extractDir, { silent: true });
      }

      // Find extracted directory
      const files = fs.readdirSync(extractDir);
      const nodeDirName = files.find(f => f.startsWith('node-'));
      assert.ok(nodeDirName, `Extracted Node.js directory not found for ${process.platform}-${process.arch}`);

      const nodeDir = path.join(extractDir, nodeDirName);

      // Verify structure based on platform
      if (process.platform === 'win32') {
        verifyWindowsStructure(nodeDir, version);
      } else {
        verifyUnixStructure(nodeDir, version);
      }
    });
  });
});

/**
 * Verify Windows archive structure
 */
function verifyWindowsStructure(nodeDir, version) {
  // Windows: executables in top-level directory (no bin/ subdirectory)
  const binDir = path.join(nodeDir, 'bin');
  assert.ok(!fs.existsSync(binDir), `Windows should not have bin/ subdirectory (${nodeDir})`);

  // Check for required executables in top-level
  assert.ok(fs.existsSync(path.join(nodeDir, 'node.exe')), 'node.exe should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'npm.cmd')), 'npm.cmd should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'npx.cmd')), 'npx.cmd should exist');

  // Check for POSIX scripts (for Git Bash, WSL)
  assert.ok(fs.existsSync(path.join(nodeDir, 'npm')), 'npm (POSIX script) should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'npx')), 'npx (POSIX script) should exist');

  // corepack was introduced in Node.js 16.9.0
  const [major] = version.split('.').map(Number);
  if (major >= 16) {
    assert.ok(fs.existsSync(path.join(nodeDir, 'corepack.cmd')), 'corepack.cmd should exist');
    assert.ok(fs.existsSync(path.join(nodeDir, 'corepack')), 'corepack (POSIX script) should exist');
  }

  // Check for metadata files
  assert.ok(fs.existsSync(path.join(nodeDir, 'README.md')), 'README.md should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'LICENSE')), 'LICENSE should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'CHANGELOG.md')), 'CHANGELOG.md should exist');

  // Check for node_modules
  const nodeModulesDir = path.join(nodeDir, 'node_modules');
  assert.ok(fs.existsSync(nodeModulesDir), 'node_modules directory should exist');
  assert.ok(fs.existsSync(path.join(nodeModulesDir, 'npm')), 'npm should exist in node_modules');
}

/**
 * Verify Unix (macOS/Linux) archive structure
 */
function verifyUnixStructure(nodeDir, version) {
  // Unix: executables in bin/ subdirectory
  const binDir = path.join(nodeDir, 'bin');
  assert.ok(fs.existsSync(binDir), 'bin/ directory should exist on Unix');

  // Check for required executables
  assert.ok(fs.existsSync(path.join(binDir, 'node')), 'node should exist');
  assert.ok(fs.existsSync(path.join(binDir, 'npm')), 'npm should exist');
  assert.ok(fs.existsSync(path.join(binDir, 'npx')), 'npx should exist');

  // corepack was introduced in Node.js 16.9.0
  const [major] = version.split('.').map(Number);
  if (major >= 16) {
    assert.ok(fs.existsSync(path.join(binDir, 'corepack')), 'corepack should exist');
  }

  // Check for metadata files
  assert.ok(fs.existsSync(path.join(nodeDir, 'README.md')), 'README.md should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'LICENSE')), 'LICENSE should exist');
  assert.ok(fs.existsSync(path.join(nodeDir, 'CHANGELOG.md')), 'CHANGELOG.md should exist');

  // Check for lib directory (Unix specific)
  const libDir = path.join(nodeDir, 'lib');
  assert.ok(fs.existsSync(libDir), 'lib/ directory should exist on Unix');

  // Check for node_modules
  const nodeModulesDir = path.join(nodeDir, 'lib', 'node_modules');
  assert.ok(fs.existsSync(nodeModulesDir), 'node_modules directory should exist in lib/');
  assert.ok(fs.existsSync(path.join(nodeModulesDir, 'npm')), 'npm should exist in lib/node_modules');
}
