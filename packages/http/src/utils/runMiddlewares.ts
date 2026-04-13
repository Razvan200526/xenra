import type { Context, Middleware } from "../types";

export async function runMiddlewares(
  ctx: Context,
  middlewares: Middleware[],
  handler: () => Promise<Response>,
): Promise<Response> {
  let index = -1;

  async function dispatch(i: number): Promise<Response> {
    if (i <= index) {
      throw new Error("next() called multiple times");
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
