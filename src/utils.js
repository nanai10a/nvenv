/**
 * Shared utility functions for nvenv
 */

/**
 * Check if silent mode should be enabled
 * Priority: explicit option > NVENV_SILENT env var > NODE_ENV=test
 * @param {object} options - Options object with optional silent property
 * @returns {boolean} Whether silent mode is enabled
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
 * Check if running on Windows
 * @returns {boolean} True if on Windows platform
 */
function isWindows() {
  return process.platform === 'win32';
}

/**
 * Log a message to console unless in silent mode
 * @param {string} message - Message to log
 * @param {object} options - Options object with optional silent property
 */
function log(message, options = {}) {
  if (!shouldBeSilent(options)) {
    console.log(message);
  }
}

/**
 * Log a warning message to console unless in silent mode
 * @param {string} message - Warning message to log
 * @param {object} options - Options object with optional silent property
 */
function warn(message, options = {}) {
  if (!shouldBeSilent(options)) {
    console.warn(message);
  }
}

/**
 * Log an error message to console (always shown, regardless of silent mode)
 * @param {string} message - Error message to log
 */
function error(message) {
  console.error(message);
}

module.exports = {
  shouldBeSilent,
  isWindows,
  log,
  warn,
  error
};
