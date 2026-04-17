import { MiddlwareException } from "../exceptions/MiddlwareException";
import type { Context, Middleware } from "../types";

export async function runMiddlewares<TContext extends Context>(
  ctx: TContext,
  middlewares: Middleware<TContext>[],
  handler: () => Promise<Response>,
): Promise<Response> {
  let index = -1;

  async function dispatch(i: number): Promise<Response> {
    if (i <= index) {
      throw new MiddlwareException("next() called multiple times");
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
