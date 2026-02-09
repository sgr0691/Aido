const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:\//;
const GLOB_PATTERN = /[*?[\]{}]/;

/**
 * Normalize a user-configured path to a POSIX-style relative path.
 */
export function normalizeConfigPath(pathValue: string): string {
  const trimmed = pathValue.trim();
  if (!trimmed) return '';

  const posixPath = trimmed.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  return posixPath.replace(/^(?:\.\/)+/, '');
}

/**
 * Ensure configured paths are relative and stay within the workspace root.
 */
export function isSafeConfigPath(pathValue: string): boolean {
  const normalized = normalizeConfigPath(pathValue);
  if (!normalized || normalized === '.') return false;
  if (normalized.startsWith('/')) return false;
  if (WINDOWS_DRIVE_PATTERN.test(normalized)) return false;

  const segments = normalized.split('/');
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    const isLast = index === segments.length - 1;

    // Allow trailing slash (directory-style output declarations).
    if (segment === '' && isLast) continue;
    if (segment === '' || segment === '.' || segment === '..') return false;
  }

  return true;
}

export function isGlobPath(pathValue: string): boolean {
  return GLOB_PATTERN.test(pathValue);
}

export function normalizeOutputRule(rule: string): string {
  const normalized = normalizeConfigPath(rule);

  if (normalized === 'outputs' || normalized === 'outputs/') {
    return '**';
  }

  if (normalized.startsWith('outputs/')) {
    return normalized.slice('outputs/'.length);
  }

  return normalized;
}

/**
 * Derive a stable search base for a glob pattern to avoid scanning the full repo.
 */
export function getGlobSearchBase(pattern: string): string {
  const normalized = normalizeConfigPath(pattern);
  let firstWildcardIndex = -1;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]!;
    if (char === '*' || char === '?' || char === '[' || char === '{') {
      firstWildcardIndex = i;
      break;
    }
  }

  if (firstWildcardIndex === -1) return normalized;
  if (firstWildcardIndex === 0) return '.';

  const prefix = normalized.slice(0, firstWildcardIndex);
  const slashIndex = prefix.lastIndexOf('/');
  if (slashIndex === -1) return '.';

  return prefix.slice(0, slashIndex) || '.';
}

export function globToRegExp(pattern: string): RegExp {
  const normalized = normalizeConfigPath(pattern);
  let regex = '^';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]!;
    const next = normalized[i + 1];

    if (char === '*') {
      if (next === '*') {
        const afterNext = normalized[i + 2];
        if (afterNext === '/') {
          regex += '(?:.*/)?';
          i += 2;
        } else {
          regex += '.*';
          i += 1;
        }
      } else {
        regex += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    if ('\\^$+?.()|{}[]'.includes(char)) {
      regex += `\\${char}`;
      continue;
    }

    regex += char;
  }

  regex += '$';
  return new RegExp(regex);
}

export function matchesPathRule(relativePath: string, rule: string): boolean {
  const normalizedPath = normalizeConfigPath(relativePath).replace(/\/+$/, '');
  const normalizedRule = normalizeOutputRule(rule);

  if (!normalizedPath || !normalizedRule) return false;
  if (normalizedRule === '**') return true;

  if (normalizedRule.endsWith('/')) {
    const directoryRule = normalizedRule.slice(0, -1);
    return normalizedPath === directoryRule || normalizedPath.startsWith(`${directoryRule}/`);
  }

  if (isGlobPath(normalizedRule)) {
    return globToRegExp(normalizedRule).test(normalizedPath);
  }

  return normalizedPath === normalizedRule;
}

export function isPathAllowed(relativePath: string, rules: string[]): boolean {
  return rules.some((rule) => matchesPathRule(relativePath, rule));
}
