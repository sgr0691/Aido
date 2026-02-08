import { SandboxManager } from '../../core/sandbox.js';
import { logger } from '../../utils/logger.js';

export async function cleanup(): Promise<void> {
  try {
    const manager = new SandboxManager();

    logger.info('Cleaning up expired sandboxes...');
    const cleaned = await manager.cleanupExpired();

    if (cleaned === 0) {
      logger.info('No expired sandboxes found');
    } else {
      logger.success(`Cleaned up ${cleaned} expired sandbox(es)`);
    }
  } catch (error) {
    logger.error('Failed to cleanup sandboxes', error);
    process.exit(1);
  }
}
