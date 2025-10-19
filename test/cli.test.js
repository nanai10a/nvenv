const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseArgs } = require('../src/cli.js');

describe('cli module', () => {
  describe('parseArgs', () => {
    it('should parse version and path correctly', () => {
      const args = ['--node=18.20.0', 'venv'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, '18.20.0');
      assert.strictEqual(parsed.envPath, 'venv');
      assert.strictEqual(parsed.help, false);
    });

    it('should parse version with v prefix', () => {
      const args = ['--node=v18.20.0', 'myenv'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, 'v18.20.0');
      assert.strictEqual(parsed.envPath, 'myenv');
    });

    it('should handle help flag (-h)', () => {
      const args = ['-h'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.help, true);
    });

    it('should handle help flag (--help)', () => {
      const args = ['--help'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.help, true);
    });

    it('should parse with path first', () => {
      const args = ['myenv', '--node=20.11.0'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, '20.11.0');
      assert.strictEqual(parsed.envPath, 'myenv');
    });

    it('should return null for missing version', () => {
      const args = ['venv'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, null);
      assert.strictEqual(parsed.envPath, 'venv');
    });

    it('should return null for missing path', () => {
      const args = ['--node=18.20.0'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, '18.20.0');
      assert.strictEqual(parsed.envPath, null);
    });

    it('should handle empty args', () => {
      const args = [];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, null);
      assert.strictEqual(parsed.envPath, null);
      assert.strictEqual(parsed.help, false);
    });

    it('should ignore unknown flags', () => {
      const args = ['--node=18.20.0', '--unknown-flag', 'venv'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, '18.20.0');
      assert.strictEqual(parsed.envPath, 'venv');
    });

    it('should handle complex paths', () => {
      const args = ['--node=18.20.0', './path/to/env'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, '18.20.0');
      assert.strictEqual(parsed.envPath, './path/to/env');
    });

    it('should handle version at end', () => {
      const args = ['venv', '--node=18.20.0'];
      const parsed = parseArgs(args);

      assert.strictEqual(parsed.version, '18.20.0');
      assert.strictEqual(parsed.envPath, 'venv');
    });

    it('should parse semantic version numbers', () => {
      const versions = [
        '18.20.0',
        '20.11.1',
        '16.14.2',
        'v22.0.0'
      ];

      versions.forEach(version => {
        const args = [`--node=${version}`, 'venv'];
        const parsed = parseArgs(args);
        assert.strictEqual(parsed.version, version);
      });
    });
  });
});
