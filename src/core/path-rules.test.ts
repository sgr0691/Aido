import { describe, expect, it } from 'vitest';
import {
  getGlobSearchBase,
  globToRegExp,
  isPathAllowed,
  isSafeConfigPath,
  matchesPathRule,
  normalizeOutputRule,
} from './path-rules.js';

describe('isSafeConfigPath', () => {
  it('accepts safe relative paths', () => {
    expect(isSafeConfigPath('data/input.json')).toBe(true);
    expect(isSafeConfigPath('logs/**/*.log')).toBe(true);
    expect(isSafeConfigPath('outputs/')).toBe(true);
  });

  it('rejects unsafe paths', () => {
    expect(isSafeConfigPath('../secrets.env')).toBe(false);
    expect(isSafeConfigPath('/etc/passwd')).toBe(false);
    expect(isSafeConfigPath('C:\\Windows\\System32')).toBe(false);
  });
});

describe('globToRegExp', () => {
  it('matches ** and * patterns', () => {
    const regex = globToRegExp('data/**/*.json');
    expect(regex.test('data/item.json')).toBe(true);
    expect(regex.test('data/nested/item.json')).toBe(true);
    expect(regex.test('data/item.txt')).toBe(false);
  });
});

describe('output rules', () => {
  it('normalizes outputs/ root alias', () => {
    expect(normalizeOutputRule('outputs/')).toBe('**');
    expect(normalizeOutputRule('outputs/report.md')).toBe('report.md');
  });

  it('matches directory, exact, and glob output rules', () => {
    expect(matchesPathRule('reports/summary.md', 'reports/')).toBe(true);
    expect(matchesPathRule('report.md', 'report.md')).toBe(true);
    expect(matchesPathRule('artifacts/a.csv', 'artifacts/*.csv')).toBe(true);
  });

  it('enforces allowlist behavior', () => {
    const rules = ['reports/', 'summary.json'];
    expect(isPathAllowed('reports/jan.md', rules)).toBe(true);
    expect(isPathAllowed('summary.json', rules)).toBe(true);
    expect(isPathAllowed('tmp/debug.log', rules)).toBe(false);
  });
});

describe('getGlobSearchBase', () => {
  it('returns stable search roots', () => {
    expect(getGlobSearchBase('data/**/*.json')).toBe('data');
    expect(getGlobSearchBase('*.md')).toBe('.');
  });
});
