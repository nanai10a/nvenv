const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createEnvironment } = require('../../src/env.js');

describe('env module (integration tests)', () => {
  const testDir = path.join(__dirname, '../.test-env-integration');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createEnvironment', () => {
    it('should create a complete working environment', { timeout: Number.POSITIVE_INFINITY }, async function () {
      // This is a slow test - disable timeout
      this.timeout = Number.POSITIVE_INFINITY; // Unlimited (Node.js test runner)
      // { timeout: Number.POSITIVE_INFINITY } in test options for Bun

      const envPath = path.join(testDir, 'integration-venv');

      // Use a small, stable Node.js version for testing
      await createEnvironment('18.20.0', envPath);

      // Verify structure
      assert.ok(fs.existsSync(envPath));
      assert.ok(fs.existsSync(path.join(envPath, 'bin')));
      assert.ok(fs.existsSync(path.join(envPath, 'lib')));
      assert.ok(fs.existsSync(path.join(envPath, '.nvenv')));

      // Verify activate scripts
      assert.ok(fs.existsSync(path.join(envPath, 'bin', 'activate')));
      assert.ok(fs.existsSync(path.join(envPath, 'bin', 'activate.fish')));

      // Verify binaries exist
      const binDir = path.join(envPath, 'bin');
      const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node';
      const nodeBinary = path.join(binDir, nodeBinaryName);

      assert.ok(
        fs.existsSync(nodeBinary) ||
        fs.existsSync(nodeBinary + '.cmd')
      );

      // Verify Node.js is executable and has correct version
      if (fs.existsSync(nodeBinary)) {
        const version = execSync(`"${nodeBinary}" --version`, { encoding: 'utf8' }).trim();
        assert.strictEqual(version, 'v18.20.0');
      }

      // Verify metadata
      const metadata = JSON.parse(
        fs.readFileSync(path.join(envPath, '.nvenv'), 'utf8')
      );
      assert.strictEqual(metadata.version, '18.20.0');
    });
  });
});
