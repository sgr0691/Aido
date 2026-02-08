import { join } from 'path';
import { writeFile } from 'fs/promises';
import { type RunResult } from '../core/schema.js';
import { getSandboxDir } from '../core/sandbox.js';
import { logger } from '../utils/logger.js';

/**
 * Evidence Generator
 *
 * Generates artifacts for each run:
 * - stdout.log
 * - stderr.log
 * - summary.json
 */
export class EvidenceGenerator {
  /**
   * Generate all artifacts for a run
   */
  async generate(sandboxId: string, result: RunResult): Promise<string[]> {
    const outputsDir = join(getSandboxDir(sandboxId), 'outputs');
    const artifacts: string[] = [];

    // Generate stdout.log
    const stdoutPath = join(outputsDir, 'stdout.log');
    await writeFile(stdoutPath, result.stdout, 'utf-8');
    artifacts.push('outputs/stdout.log');
    logger.debug('Generated stdout.log', { size: result.stdout.length });

    // Generate stderr.log
    const stderrPath = join(outputsDir, 'stderr.log');
    await writeFile(stderrPath, result.stderr, 'utf-8');
    artifacts.push('outputs/stderr.log');
    logger.debug('Generated stderr.log', { size: result.stderr.length });

    // Generate summary.json
    const summary = {
      run_id: result.run_id,
      sandbox_id: result.sandbox_id,
      task: result.task,
      started_at: result.started_at,
      completed_at: result.completed_at,
      duration_ms: result.duration_ms,
      exit_code: result.exit_code,
      success: result.exit_code === 0,
      artifacts: artifacts,
    };

    const summaryPath = join(outputsDir, 'summary.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    artifacts.push('outputs/summary.json');
    logger.debug('Generated summary.json');

    logger.success(`Generated ${artifacts.length} artifacts`);

    return artifacts;
  }

  /**
   * Generate run report (human-readable)
   */
  generateReport(result: RunResult): string {
    const duration = (result.duration_ms / 1000).toFixed(2);
    const status = result.exit_code === 0 ? '✓ SUCCESS' : '✗ FAILED';

    let report = '';
    report += '━'.repeat(80) + '\n';
    report += `Run Report\n`;
    report += '━'.repeat(80) + '\n';
    report += `Run ID:       ${result.run_id}\n`;
    report += `Sandbox:      ${result.sandbox_id}\n`;
    report += `Task:         ${result.task}\n`;
    report += `Status:       ${status}\n`;
    report += `Exit Code:    ${result.exit_code}\n`;
    report += `Duration:     ${duration}s\n`;
    report += `Started:      ${result.started_at}\n`;
    report += `Completed:    ${result.completed_at}\n`;
    report += '━'.repeat(80) + '\n';

    if (result.stdout) {
      report += '\nStandard Output:\n';
      report += '─'.repeat(80) + '\n';
      report += result.stdout;
      if (!result.stdout.endsWith('\n')) report += '\n';
      report += '─'.repeat(80) + '\n';
    }

    if (result.stderr) {
      report += '\nStandard Error:\n';
      report += '─'.repeat(80) + '\n';
      report += result.stderr;
      if (!result.stderr.endsWith('\n')) report += '\n';
      report += '─'.repeat(80) + '\n';
    }

    report += '\nArtifacts:\n';
    result.artifacts.forEach((artifact) => {
      report += `  📦 ${artifact}\n`;
    });

    return report;
  }
}
