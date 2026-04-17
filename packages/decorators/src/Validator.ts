/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <Workaround for decorator pattern> */

import { ValidationException } from "@xenra/exceptions";
import type { logger } from "@xenra/logger";
import type { Type } from "arktype";
import { type } from "arktype";
import { Logger } from "./Logger";
import type { IValidator } from "./types";

export interface Validator<TInput = unknown, TOutput = TInput> extends IValidator<TInput, TOutput> {
  logger: typeof logger;
  validate(input: TInput): TOutput | Promise<TOutput>;
}

@Logger
export class Validator<TInput = unknown, TOutput = TInput> implements IValidator<TInput, TOutput> {
  constructor(private readonly schema: Type<TInput, TOutput>) {}

  validate(input: TInput): TOutput | Promise<TOutput> {
    const result = this.schema(input);

    if (result instanceof type.errors) {
      throw new ValidationException(result.summary);
    }
    return result as TOutput;
  }
}
