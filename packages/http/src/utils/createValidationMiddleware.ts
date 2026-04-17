import type { RouteMetadata, RouteValidators } from "@xenra/decorators";
import type { Context, InferValidated, Middleware, ValidatedData } from "../types";

export function createValidationMiddleware<TValidators extends RouteValidators | undefined = undefined>(
  meta: RouteMetadata<TValidators>,
): Middleware<Context<InferValidated<TValidators>>> {
  return async (ctx, next) => {
    if (meta.validators?.query) {
      (ctx.validated as ValidatedData).query = await meta.validators.query.validate(ctx.query);
    }

    if (meta.validators?.body) {
      (ctx.validated as ValidatedData).body = await meta.validators.body.validate(ctx.body);
    }

    if (meta.validators?.params) {
      (ctx.validated as ValidatedData).params = await meta.validators.params.validate(ctx.params);
    }

    return next();
  };
}
