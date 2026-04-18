import { afterEach, describe, expect, test } from "bun:test";
import { ValidationException } from "@xenra/exceptions";
import { logger } from "@xenra/logger";
import { type } from "arktype";
import { Logger } from "../src/Logger";
import { Validator } from "../src/Validator";

const originalLogger = logger;

describe("@xenra/decorators Logger and Validator", () => {
  afterEach(() => {
    Object.assign(logger, originalLogger);
  });

  test("Logger decorator injects the shared logger instance", () => {
    @Logger
    class LoggedService {
      declare logger: typeof logger;
    }

    const instance = new LoggedService();

    expect(instance.logger).toBe(logger);
  });

  test("Validator returns parsed values for valid input", () => {
    const validator = new Validator(type({ id: "string", count: "number" }));

    expect(validator.validate({ id: "abc", count: 2 })).toEqual({
      id: "abc",
      count: 2,
    });
  });

  test("Validator throws ValidationException for invalid input", () => {
    const validator = new Validator(type({ id: "string" }));

    expect(() => validator.validate({ id: 42 })).toThrow(ValidationException);
  });

  test("Validator instances receive the shared logger through the decorator", () => {
    const validator = new Validator(type({ id: "string" })) as Validator<{ id: string }> & {
      logger: typeof logger;
    };

    expect(validator.logger).toBe(logger);
  });
});
