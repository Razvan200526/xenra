import { HttpException } from "@xenra/exceptions";
import { logger } from "@xenra/logger";
import type { SocketContext } from "./types";

export function createSocketErrorResponse(
  context: SocketContext,
  message: string,
  status = 400,
  key?: string | null,
): Response {
  return context.json(
    {
      ok: false,
      message,
      ...(key ? { key } : {}),
    },
    { status },
  );
}

export function createSocketExceptionResponse(context: SocketContext, error: unknown): Response {
  if (error instanceof HttpException) {
    return context.json(
      {
        error: error.message,
      },
      { status: error.statusCode ?? 400 },
    );
  }

  logger.exception(error);

  return context.json(
    {
      error: "Internal Server Error",
    },
    { status: 500 },
  );
}

export async function sendSocketError(
  context: SocketContext,
  message: string,
  status = 400,
  key?: string | null,
): Promise<void> {
  await context.channel.send(createSocketErrorResponse(context, message, status, key));
}
