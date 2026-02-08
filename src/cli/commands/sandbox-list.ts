import { SandboxManager } from '../../core/sandbox.js';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';

export async function sandboxList(): Promise<void> {
  try {
    const manager = new SandboxManager();
    const sandboxes = await manager.list();

    if (sandboxes.length === 0) {
      logger.info('No sandboxes found');
      logger.info('Create one with: aido sandbox up');
      return;
    }

    console.log();
    console.log(chalk.bold('Sandboxes:'));
    console.log();

    for (const sandbox of sandboxes) {
      const expired = manager.isExpired(sandbox);
      const statusColor =
        sandbox.status === 'completed'
          ? chalk.green
          : sandbox.status === 'failed'
            ? chalk.red
            : chalk.yellow;

      console.log(
        `${chalk.cyan(sandbox.id)}  ${statusColor(sandbox.status)}${expired ? chalk.red(' [EXPIRED]') : ''}`
      );
      console.log(`  Name:     ${sandbox.config.name}`);
      console.log(`  Runtime:  ${sandbox.config.runtime}`);
      console.log(`  TTL:      ${sandbox.config.ttl}`);
      console.log(`  Created:  ${sandbox.created_at}`);
      console.log(`  Runs:     ${sandbox.runs.length}`);
      console.log();
    }
  } catch (error) {
    logger.error('Failed to list sandboxes', error);
    process.exit(1);
  }
}
