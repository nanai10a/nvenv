#!/usr/bin/env node

const path = require('path');
const { createEnvironment } = require('./env');

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments
 */
function parseArgs(args) {
  const parsed = {
    version: null,
    envPath: null,
    help: false,
    silent: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      parsed.help = true;
    } else if (arg === '--silent' || arg === '-s') {
      parsed.silent = true;
    } else if (arg.startsWith('--node=')) {
      parsed.version = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      // This is the environment path
      parsed.envPath = arg;
    }
  }

  return parsed;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
nvenv - Python venv-like Node.js environment manager

Usage:
  npx nvenv --node=<version> <path>

Arguments:
  <path>              Path where to create the virtual environment

Options:
  --node=<version>    Node.js version to install (e.g., 18.16.0 or v18.16.0)
  -s, --silent        Suppress progress output
  -h, --help          Show this help message

Examples:
  # Create environment with Node.js 18.16.0
  npx nvenv --node=18.16.0 venv

  # Create environment with Node.js 20.0.0
  npx nvenv --node=20.0.0 myproject

After creating the environment, activate it with:
  source venv/bin/activate

To deactivate:
  deactivate

Note: This tool is inspired by Python's venv and follows the same philosophy
of project-local installations without global environment pollution.
`);
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.help) {
    showHelp();
    process.exit(0);
  }

  if (!parsed.version) {
    console.error('Error: Node.js version is required. Use --node=<version>');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  if (!parsed.envPath) {
    console.error('Error: Environment path is required.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  // Resolve to absolute path
  const envPath = path.resolve(process.cwd(), parsed.envPath);

  // Determine silent mode: CLI flag or environment variable
  const silent = parsed.silent ||
                 process.env.NVENV_SILENT === '1' ||
                 process.env.NODE_ENV === 'test';

  try {
    await createEnvironment(parsed.version, envPath, { silent });
    process.exit(0);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, showHelp };
