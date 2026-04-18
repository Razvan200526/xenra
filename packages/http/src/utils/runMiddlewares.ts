import { MiddlewareException } from "../exceptions/MiddlewareException";
import type { Context, Middleware } from "../types";

export async function runMiddlewares<TContext extends Context, TResult>(
  ctx: TContext,
  middlewares: Middleware<TContext, TResult>[],
  handler: () => Promise<TResult>,
): Promise<TResult> {
  let index = -1;

  async function dispatch(i: number): Promise<TResult> {
    if (i <= index) {
      throw new MiddlewareException("next() called multiple times");
    }

    index = i;

    const middleware = middlewares[i];

    if (!middleware) {
      return handler();
    }

    return middleware(ctx, () => dispatch(i + 1));
  }

  return dispatch(0);
}
