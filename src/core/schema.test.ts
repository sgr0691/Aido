import { describe, it, expect } from 'vitest';
import { parseDuration, parseDurationMs, parseMemory, sandboxConfigSchema } from './schema.js';

describe('parseDuration', () => {
  it('should parse seconds', () => {
    expect(parseDuration('30s')).toBe(0.5);
    expect(parseDuration('60s')).toBe(1);
  });

  it('should parse minutes', () => {
    expect(parseDuration('1m')).toBe(1);
    expect(parseDuration('15m')).toBe(15);
  });

  it('should parse hours', () => {
    expect(parseDuration('1h')).toBe(60);
    expect(parseDuration('2h')).toBe(120);
  });

  it('should throw on invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow();
    expect(() => parseDuration('10')).toThrow();
  });
});

describe('parseDurationMs', () => {
  it('should convert to milliseconds', () => {
    expect(parseDurationMs('1m')).toBe(60000);
    expect(parseDurationMs('1h')).toBe(3600000);
  });
});

describe('parseMemory', () => {
  it('should parse megabytes', () => {
    expect(parseMemory('512M')).toBe(512 * 1024 * 1024);
    expect(parseMemory('1024M')).toBe(1024 * 1024 * 1024);
  });

  it('should parse gigabytes', () => {
    expect(parseMemory('1G')).toBe(1024 * 1024 * 1024);
    expect(parseMemory('2G')).toBe(2 * 1024 * 1024 * 1024);
  });

  it('should throw on invalid format', () => {
    expect(() => parseMemory('invalid')).toThrow();
    expect(() => parseMemory('512')).toThrow();
  });
});

describe('sandboxConfigSchema', () => {
  it('should validate valid config', () => {
    const config = {
      name: 'test',
      runtime: 'python:3.11',
      ttl: '15m',
    };

    expect(() => sandboxConfigSchema.parse(config)).not.toThrow();
  });

  it('should apply defaults', () => {
    const config = {
      name: 'test',
      runtime: 'python:3.11',
      ttl: '15m',
    };

    const parsed = sandboxConfigSchema.parse(config);

    expect(parsed.inputs).toEqual([]);
    expect(parsed.outputs).toEqual(['outputs/']);
    expect(parsed.permissions?.filesystem).toBe('readonly');
    expect(parsed.permissions?.network).toBe(false);
  });

  it('should reject invalid TTL', () => {
    const config = {
      name: 'test',
      runtime: 'python:3.11',
      ttl: '25h', // Too long
    };

    expect(() => sandboxConfigSchema.parse(config)).toThrow();
  });

  it('should reject missing required fields', () => {
    const config = {
      name: 'test',
      // Missing runtime and ttl
    };

    expect(() => sandboxConfigSchema.parse(config)).toThrow();
  });
});
