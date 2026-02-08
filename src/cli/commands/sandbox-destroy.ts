import { SandboxManager } from '../../core/sandbox.js';
import { logger } from '../../utils/logger.js';

interface SandboxDestroyOptions {
  all?: boolean;
}

export async function sandboxDestroy(
  sandboxId: string | undefined,
  options: SandboxDestroyOptions
): Promise<void> {
  try {
    const manager = new SandboxManager();

    if (options.all) {
      // Destroy all sandboxes
      const sandboxes = await manager.list();

      if (sandboxes.length === 0) {
        logger.info('No sandboxes found');
        return;
      }

      logger.info(`Destroying ${sandboxes.length} sandbox(es)...`);

      for (const sandbox of sandboxes) {
        await manager.destroy(sandbox.id);
      }

      logger.success(`Destroyed ${sandboxes.length} sandbox(es)`);
    } else if (sandboxId) {
      // Destroy specific sandbox
      await manager.destroy(sandboxId);
    } else {
      // Destroy latest
      const metadata = await manager.getLatest();
      if (!metadata) {
        throw new Error('No sandbox found');
      }
      await manager.destroy(metadata.id);
    }
  } catch (error) {
    logger.error('Failed to destroy sandbox', error);
    process.exit(1);
  }
}
