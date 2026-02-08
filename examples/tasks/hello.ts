#!/usr/bin/env node
/**
 * Simple Hello World task for Aido (TypeScript/Node.js)
 *
 * This demonstrates the basics of an Aido task:
 * - Reading from inputs (if provided)
 * - Writing to outputs
 * - Logging to stdout
 * - Exiting with status code
 */

import { writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function main(): number {
  console.log('='.repeat(50));
  console.log('Aido Example Task: Hello World (TypeScript)');
  console.log('='.repeat(50));
  console.log();

  // Show environment info
  const now = new Date().toISOString();
  console.log(`Task started at: ${now}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log();

  // Check for inputs
  const inputsDir = '/inputs';
  if (existsSync(inputsDir)) {
    console.log('📁 Inputs available:');
    const files = getAllFiles(inputsDir);
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
  } else {
    console.log('📁 No inputs directory found (running in local mode)');
  }
  console.log();

  // Create output
  const outputsDir = existsSync('/outputs') ? '/outputs' : './outputs';
  const outputFile = join(outputsDir, 'hello.txt');

  const message = `Hello from Aido!

Generated at: ${now}
Node version: ${process.version}

This is a simple example task that demonstrates:
✓ Execution in an isolated sandbox
✓ Reading from inputs (if provided)
✓ Writing to outputs
✓ Logging to stdout

Status: SUCCESS
`;

  writeFileSync(outputFile, message, 'utf-8');
  console.log(`✓ Output written to: ${outputFile}`);
  console.log();

  // Success
  console.log('='.repeat(50));
  console.log('Task completed successfully!');
  console.log('='.repeat(50));
  return 0;
}

function getAllFiles(dir: string, base = ''): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const relativePath = join(base, item);

    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

process.exit(main());
