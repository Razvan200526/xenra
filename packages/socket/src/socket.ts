import { HttpException } from "@xenra/exceptions";
import { router, runMiddlewares } from "@xenra/http";
import { logger } from "@xenra/logger";
import type { Server, ServerWebSocket } from "bun";
import { createSocketContext, createSocketHandshakeContext } from "./context";
import { isTextSocketMessage, parseSocketMessage, resolveSocketController } from "./controller";
import { createSocketExceptionResponse, sendSocketError } from "./errors";
import { createSocketSession, deleteSocketSession, getSocketSession } from "./session";
import type { SocketConnectionData, SocketController, SocketData, SocketMessage, SocketMiddleware } from "./types";

export type SocketHandlerInput = {
  ws: ServerWebSocket<SocketConnectionData>;
  server: Server<SocketConnectionData>;
  message: SocketMessage;
  middlewares?: SocketMiddleware[];
};

type UpgradeSocketInput = {
  req: Request;
  server: Server<SocketConnectionData>;
  data?: SocketData;
};

type UpgradeSocketResult = false | Response | undefined;

export const tryUpgradeSocket = async ({ req, server, data }: UpgradeSocketInput): Promise<UpgradeSocketResult> => {
  const matchedRoute = router.matchSocketRoute(new URL(req.url).pathname);
  if (!matchedRoute) {
    return false;
  }

  const context = createSocketHandshakeContext({
    req,
    route: matchedRoute.route,
    params: matchedRoute.params,
    data,
  });

  try {
    const handshakeResponse = await runMiddlewares(
      context,
      matchedRoute.route.middlewares ?? [],
      async () => undefined,
    );
    if (handshakeResponse instanceof Response) {
      return handshakeResponse;
    }
  } catch (error) {
    return createSocketExceptionResponse(context, error);
  }

  const session = createSocketSession({
    req,
    route: matchedRoute.route,
    params: matchedRoute.params,
    validated: context.validated,
    data,
  });

  const upgraded = server.upgrade(req, {
    data: {
      id: session.id,
      data,
    },
  });

  if (!upgraded) {
    deleteSocketSession(session.id);
    return context.json(
      {
        error: "Failed to upgrade websocket connection",
      },
      { status: 500 },
    );
  }

  return undefined;
};

export const socketHandler = async ({ ws, server, message, middlewares }: SocketHandlerInput): Promise<void> => {
  const session = getSocketSession(ws);
  if (!session) {
    ws.close(1011, "Socket session not found");
    return;
  }

  if (!isTextSocketMessage(message)) {
    const context = createSocketContext({
      ws,
      server,
      message: "",
      session,
      body: undefined,
    });

    await sendSocketError(context, "Binary websocket frames are not supported", 400, "UNSUPPORTED_FRAME_TYPE");
    return;
  }

  let body: unknown;
  try {
    body = parseSocketMessage(message);
  } catch (error) {
    logger.exception(error);
    const context = createSocketContext({
      ws,
      server,
      message,
      session,
      body: undefined,
    });

    await sendSocketError(context, "Invalid JSON format");
    return;
  }

  const context = createSocketContext({
    ws,
    server,
    message,
    session,
    body,
  });

  const controller = resolveSocketController(session.route.controller) as SocketController;
  const requestMiddlewares = middlewares ?? [];

  try {
    const response = await runMiddlewares(context, requestMiddlewares, async () => {
      return await controller.handler.call(controller, context);
    });

    if (response instanceof Response) {
      await context.channel.send(response);
    }
  } catch (error) {
    if (error instanceof HttpException) {
      await context.channel.send(
        context.json(
          {
            ok: false,
            message: error.message,
          },
          { status: error.statusCode ?? 400 },
        ),
      );
      return;
    }

    logger.exception(error);
    await context.channel.send(
      context.json(
        {
          ok: false,
          message: "Internal Server Error",
        },
        { status: 500 },
      ),
    );
  }
};
