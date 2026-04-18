/** biome-ignore-all lint/suspicious/noConsole: <test> */
import { afterEach, describe, expect, test } from "bun:test";
import { logger } from "../src";

const originalConsole = {
  error: console.error,
  log: console.log,
  warn: console.warn,
};

describe("@xenra/logger", () => {
  afterEach(() => {
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
  });

  test("error writes a formatted error message", () => {
    const calls: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      calls.push(args);
    };

    logger.error("Boom");

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.[0])).toContain("Boom");
  });

  test("success and info write to console.log", () => {
    const calls: unknown[][] = [];
    console.log = (...args: unknown[]) => {
      calls.push(args);
    };

    logger.success("Started");
    logger.info("Listening");

    expect(calls).toHaveLength(2);
    expect(String(calls[0]?.[0])).toContain("Started");
    expect(String(calls[1]?.[0])).toContain("Listening");
  });

  test("warn writes to console.warn", () => {
    const calls: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      calls.push(args);
    };

    logger.warn("Careful");

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.[0])).toContain("Careful");
  });

  test("exception renders Error instances and passes through non-errors", () => {
    const calls: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      calls.push(args);
    };

    logger.exception(new Error("boom"));
    logger.exception({ ok: false });

    expect(calls).toHaveLength(2);
    expect(String(calls[0]?.[0])).toContain("boom");
    expect(calls[1]?.[0]).toEqual({ ok: false });
  });
});
