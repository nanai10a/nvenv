const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  createEnvironment,
  createEnvStructure,
  createBinSymlinks,
  createActivateScripts,
  saveMetadata
} = require('../src/env.js');

describe('env module', () => {
  const testDir = path.join(__dirname, '.test-env');

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

  describe('createEnvStructure', () => {
    it('should create environment directory structure', () => {
      const envPath = path.join(testDir, 'venv');

      createEnvStructure(envPath);

      assert.ok(fs.existsSync(envPath));
      assert.ok(fs.existsSync(path.join(envPath, 'bin')));
      assert.ok(fs.existsSync(path.join(envPath, 'lib')));
    });

    it('should handle existing directories', () => {
      const envPath = path.join(testDir, 'venv');

      // Create twice - should not throw
      createEnvStructure(envPath);
      createEnvStructure(envPath);

      assert.ok(fs.existsSync(envPath));
    });
  });

  describe('createActivateScripts', () => {
    it('should create bash activate script', () => {
      const envPath = path.join(testDir, 'venv');
      createEnvStructure(envPath);

      createActivateScripts(envPath);

      const activatePath = path.join(envPath, 'bin', 'activate');
      assert.ok(fs.existsSync(activatePath));

      const content = fs.readFileSync(activatePath, 'utf8');
      assert.ok(content.includes('deactivate'));
      assert.ok(content.includes('PATH'));
      assert.ok(content.includes('(nvenv)'));
    });

    it('should create fish activate script', () => {
      const envPath = path.join(testDir, 'venv');
      createEnvStructure(envPath);

      createActivateScripts(envPath);

      const fishActivatePath = path.join(envPath, 'bin', 'activate.fish');
      assert.ok(fs.existsSync(fishActivatePath));

      const content = fs.readFileSync(fishActivatePath, 'utf8');
      assert.ok(content.includes('function deactivate'));
      assert.ok(content.includes('fish_prompt'));
      assert.ok(content.includes('(nvenv)'));
    });
  });

  describe('saveMetadata', () => {
    it('should save metadata to .nvenv file', () => {
      const envPath = path.join(testDir, 'venv');
      createEnvStructure(envPath);

      const info = {
        version: '18.20.0',
        platform: 'darwin',
        arch: 'arm64'
      };

      saveMetadata(envPath, info);

      const metadataPath = path.join(envPath, '.nvenv');
      assert.ok(fs.existsSync(metadataPath));

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      assert.strictEqual(metadata.version, '18.20.0');
      assert.strictEqual(metadata.platform, 'darwin');
      assert.strictEqual(metadata.arch, 'arm64');
      assert.ok(metadata.created);
    });
  });

  describe('createBinSymlinks', () => {
    it('should create symlinks for node binaries', () => {
      const envPath = path.join(testDir, 'venv');
      createEnvStructure(envPath);

      // Create a mock Node.js installation
      const nodePath = path.join(envPath, 'lib', 'node-v18.20.0');
      const nodeBinDir = path.join(nodePath, 'bin');
      fs.mkdirSync(nodeBinDir, { recursive: true });

      // Create mock binaries
      fs.writeFileSync(path.join(nodeBinDir, 'node'), '#!/bin/sh\necho node');
      fs.writeFileSync(path.join(nodeBinDir, 'npm'), '#!/bin/sh\necho npm');
      fs.writeFileSync(path.join(nodeBinDir, 'npx'), '#!/bin/sh\necho npx');

      createBinSymlinks(envPath, nodePath);

      const binDir = path.join(envPath, 'bin');

      // Check that symlinks or wrapper scripts exist
      // On some systems symlinks work, on others we use wrapper scripts
      assert.ok(
        fs.existsSync(path.join(binDir, 'node')) ||
        fs.existsSync(path.join(binDir, 'node.cmd'))
      );
      assert.ok(
        fs.existsSync(path.join(binDir, 'npm')) ||
        fs.existsSync(path.join(binDir, 'npm.cmd'))
      );
      assert.ok(
        fs.existsSync(path.join(binDir, 'npx')) ||
        fs.existsSync(path.join(binDir, 'npx.cmd'))
      );
    });
  });

  describe('createEnvironment (integration test)', () => {
    it('should create a complete working environment', { timeout: 0 }, async function() {
      // This is a slow test - disable timeout
      this.timeout = 0; // Unlimited (Node.js test runner)
      // { timeout: 0 } in test options for Bun

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
      assert.ok(
        fs.existsSync(path.join(binDir, 'node')) ||
        fs.existsSync(path.join(binDir, 'node.cmd'))
      );

      // Verify Node.js is executable and has correct version
      const nodeBinary = path.join(binDir, 'node');
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
