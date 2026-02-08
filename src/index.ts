import { createCLI } from './cli/index.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    const program = await createCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error('Unexpected error', error);
    process.exit(1);
  }
}

main();
