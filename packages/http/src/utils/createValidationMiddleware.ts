import type { Middleware } from "../types";
import type { RouteMetadata } from "@xenra/decorators";
export function createValidationMiddleware(meta: RouteMetadata): Middleware {
  return async (ctx, next) => {
    if (meta.validators?.query) {
      ctx.validated.query = await meta.validators.query.validate(ctx.query);
    }

    if (meta.validators?.body) {
      ctx.validated.body = await meta.validators.body.validate(ctx.body);
    }

    if (meta.validators?.params) {
      ctx.validated.params = await meta.validators.params.validate(ctx.params);
    }

    return next();
  };
}
