import { HttpException } from "@xenra/exceptions";
import type { Context } from "@xenra/http";
import { logger } from "@xenra/logger";

export const handleRouteException = (ctx: Context, err: unknown) => {
  if (err instanceof HttpException) {
    return ctx.json(
      {
        error: err.message,
      },
      { status: err.statusCode ?? 400 },
    );
  }

  logger.exception(err);

  return ctx.json(
    {
      error: "Internal Server Error",
    },
    { status: 500 },
  );
};
