const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getPlatform, getArch, getExtension, getNodeDownloadInfo } = require('../src/platform.js');

describe('platform module', () => {
  describe('getPlatform', () => {
    it('should return current platform', () => {
      const platform = getPlatform();
      assert.ok(['darwin', 'linux', 'win32'].includes(platform));
    });

    it('should match process.platform for supported platforms', () => {
      const platform = getPlatform();
      assert.strictEqual(platform, process.platform);
    });
  });

  describe('getArch', () => {
    it('should return current architecture', () => {
      const arch = getArch();
      assert.ok(['x64', 'arm64'].includes(arch));
    });

    it('should map x64 correctly', () => {
      if (process.arch === 'x64') {
        assert.strictEqual(getArch(), 'x64');
      }
    });

    it('should map arm64 correctly', () => {
      if (process.arch === 'arm64') {
        assert.strictEqual(getArch(), 'arm64');
      }
    });
  });

  describe('getExtension', () => {
    it('should return zip for win32', () => {
      assert.strictEqual(getExtension('win32'), 'zip');
    });

    it('should return tar.gz for darwin', () => {
      assert.strictEqual(getExtension('darwin'), 'tar.gz');
    });

    it('should return tar.gz for linux', () => {
      assert.strictEqual(getExtension('linux'), 'tar.gz');
    });
  });

  describe('getNodeDownloadInfo', () => {
    it('should generate correct download info', () => {
      const info = getNodeDownloadInfo('18.20.0');

      assert.ok(info.url);
      assert.ok(info.filename);
      assert.ok(info.extension);
      assert.ok(info.platform);
      assert.ok(info.arch);
      assert.strictEqual(info.version, '18.20.0');
    });

    it('should normalize version with v prefix', () => {
      const info = getNodeDownloadInfo('v18.20.0');
      assert.strictEqual(info.version, '18.20.0');
      assert.ok(info.url.includes('/v18.20.0/'));
    });

    it('should normalize version without v prefix', () => {
      const info = getNodeDownloadInfo('18.20.0');
      assert.strictEqual(info.version, '18.20.0');
      assert.ok(info.url.includes('/v18.20.0/'));
    });

    it('should generate valid URL format', () => {
      const info = getNodeDownloadInfo('18.20.0');
      assert.ok(info.url.startsWith('https://nodejs.org/dist/'));

      // URL uses mapped platform name (win32 -> win, others stay the same)
      const expectedPlatformInUrl = process.platform === 'win32' ? 'win' : process.platform;
      assert.ok(info.url.includes(`node-v18.20.0-${expectedPlatformInUrl}-${info.arch}`));
    });

    it('should include correct extension in filename', () => {
      const info = getNodeDownloadInfo('18.20.0');
      const expectedExt = process.platform === 'win32' ? 'zip' : 'tar.gz';
      assert.strictEqual(info.extension, expectedExt);
      assert.ok(info.url.endsWith(`.${expectedExt}`));
    });

    it('should use "win" not "win32" in Windows filenames', () => {
      const info = getNodeDownloadInfo('18.20.0');

      if (process.platform === 'win32') {
        // On Windows, filename should use 'win' not 'win32'
        assert.ok(info.filename.includes('-win-'));
        assert.ok(!info.filename.includes('-win32-'));
        assert.ok(info.url.includes('/node-v18.20.0-win-'));
      } else {
        // On Unix, should use platform name as-is
        assert.ok(info.filename.includes(`-${process.platform}-`));
      }
    });
  });
});
