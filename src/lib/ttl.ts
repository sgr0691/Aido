/**
 * Parse a TTL string into milliseconds.
 * Supports: "30s", "5m", "1h"
 */
export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}. Use <number>(s|m|h).`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown TTL unit: ${unit}`);
  }
}
