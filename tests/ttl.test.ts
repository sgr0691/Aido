import { describe, it, expect } from "vitest";
import { parseTtl } from "../src/lib/ttl.js";

describe("parseTtl", () => {
  it("parses seconds", () => {
    expect(parseTtl("30s")).toBe(30_000);
    expect(parseTtl("1s")).toBe(1_000);
    expect(parseTtl("120s")).toBe(120_000);
  });

  it("parses minutes", () => {
    expect(parseTtl("5m")).toBe(300_000);
    expect(parseTtl("1m")).toBe(60_000);
    expect(parseTtl("20m")).toBe(1_200_000);
  });

  it("parses hours", () => {
    expect(parseTtl("1h")).toBe(3_600_000);
    expect(parseTtl("2h")).toBe(7_200_000);
  });

  it("throws on invalid format", () => {
    expect(() => parseTtl("abc")).toThrow("Invalid TTL format");
    expect(() => parseTtl("5d")).toThrow("Invalid TTL format");
    expect(() => parseTtl("")).toThrow("Invalid TTL format");
    expect(() => parseTtl("m5")).toThrow("Invalid TTL format");
  });
});
