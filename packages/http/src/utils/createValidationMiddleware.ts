import type { Context, InferValidated, Middleware, RouteValidators, ValidatedData } from "../types";

export function createValidationMiddleware<
  TValidators extends RouteValidators | undefined = undefined,
  TContext extends Context<InferValidated<TValidators>> = Context<InferValidated<TValidators>>,
  TResult = Response,
>(validators: TValidators): Middleware<TContext, TResult> {
  return async (ctx, next) => {
    if (validators?.query) {
      (ctx.validated as ValidatedData).query = await validators.query.validate(ctx.query);
    }

    if (validators?.body) {
      (ctx.validated as ValidatedData).body = await validators.body.validate(ctx.body);
    }

    if (validators?.params) {
      (ctx.validated as ValidatedData).params = await validators.params.validate(ctx.params);
    }

    return next();
  };
}
