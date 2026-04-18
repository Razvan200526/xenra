import { createContext } from "@xenra/http";
import type { Server, ServerWebSocket } from "bun";
import type { SocketConnectionData, SocketContext, SocketData, SocketSession } from "./types";

type CreateSocketHandshakeContextInput = {
  req: Request;
  route: SocketSession["route"];
  params: SocketSession["params"];
  data?: SocketData;
};

type CreateSocketContextInput = {
  ws: ServerWebSocket<SocketConnectionData>;
  server: Server<SocketConnectionData>;
  message: string;
  session: SocketSession;
  body: unknown;
};

function createPreUpgradeChannel(): SocketContext["channel"] {
  const unavailable = async (): Promise<void> => {
    throw new Error("Socket channel is not available before the connection is upgraded");
  };

  return {
    send: unavailable,
    close: () => {
      throw new Error("Socket channel is not available before the connection is upgraded");
    },
    subscribe: unavailable,
    unsubscribe: unavailable,
    isSubscribed: () => false,
    publish: unavailable,
  };
}

export function createSocketHandshakeContext({
  req,
  route,
  params,
  data,
}: CreateSocketHandshakeContextInput): SocketContext {
  const context = createContext(req) as SocketContext;

  context.method = "SOCKET";
  context.params = params;
  context.bodyParsed = true;
  context.message = "";
  context.route = route;
  context.data = data;
  context.channel = createPreUpgradeChannel();

  return context;
}

export function createSocketContext({ ws, server, message, session, body }: CreateSocketContextInput): SocketContext {
  const context = createSocketHandshakeContext({
    req: session.req,
    route: session.route,
    params: session.params,
    data: session.data,
  });

  context.body = body;
  context.message = message;
  context.validated = session.validated;
  context.data = ws.data.data ?? session.data;
  context.channel = {
    send: async (response: Response) => {
      ws.send(await response.text());
    },
    close: (code?: number, reason?: string) => {
      ws.close(code, reason);
    },
    subscribe: async (): Promise<void> => {
      ws.subscribe(session.route.name);
    },
    unsubscribe: async (): Promise<void> => {
      ws.unsubscribe(session.route.name);
    },
    isSubscribed: (): boolean => {
      return ws.isSubscribed(session.route.name);
    },
    publish: async (response: Response): Promise<void> => {
      server.publish(session.route.name, await response.text());
    },
  };

  return context;
}
