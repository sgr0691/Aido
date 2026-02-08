import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sandboxUp } from './commands/sandbox-up.js';
import { run } from './commands/run.js';
import { logs } from './commands/logs.js';
import { sandboxDestroy } from './commands/sandbox-destroy.js';
import { sandboxList } from './commands/sandbox-list.js';
import { cleanup } from './commands/cleanup.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getVersion(): Promise<string> {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch {
    return '0.1.0';
  }
}

export async function createCLI(): Promise<Command> {
  const program = new Command();
  const version = await getVersion();

  program
    .name('aido')
    .description('Run AI-generated code safely against real infrastructure')
    .version(version)
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Enable verbose logging')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.verbose) {
        logger.setLevel('debug');
      }
      if (opts.json) {
        logger.setJsonMode(true);
      }
    });

  // Sandbox commands
  const sandboxCmd = program.command('sandbox').description('Manage sandboxes');

  sandboxCmd
    .command('up')
    .description('Create a new sandbox')
    .option('-f, --file <path>', 'Path to sandbox.yaml config file')
    .option('-n, --name <name>', 'Sandbox name')
    .option('-r, --runtime <runtime>', 'Runtime (e.g., python:3.11, node:18)')
    .option('-t, --ttl <duration>', 'Time-to-live (e.g., 15m, 2h)')
    .action(sandboxUp);

  sandboxCmd
    .command('list')
    .alias('ls')
    .description('List all sandboxes')
    .action(sandboxList);

  sandboxCmd
    .command('destroy [id]')
    .description('Destroy a sandbox')
    .option('-a, --all', 'Destroy all sandboxes')
    .action(sandboxDestroy);

  sandboxCmd
    .command('cleanup')
    .description('Clean up expired sandboxes')
    .action(cleanup);

  // Run command
  program
    .command('run <task>')
    .description('Execute a task in a sandbox')
    .option('-s, --sandbox <id>', 'Sandbox ID (uses latest if not specified)')
    .option('--dangerous-allow-mutations', 'Allow file mutations (DANGEROUS)')
    .option('--network', 'Enable network access')
    .action(run);

  // Logs command
  program
    .command('logs')
    .description('Show logs from the latest run')
    .option('-s, --sandbox <id>', 'Sandbox ID (uses latest if not specified)')
    .option('--stderr', 'Show stderr instead of stdout')
    .action(logs);

  // UI command (placeholder)
  program
    .command('ui')
    .description('Launch terminal UI (coming soon)')
    .action(() => {
      logger.info('Terminal UI is coming soon!');
      logger.info('Track progress: https://github.com/sgr0691/Aido/issues');
    });

  return program;
}
