/** biome-ignore-all lint/suspicious/noConsole: <until websocket implementation> */

import { container, EContainerScope } from "@xenra/container";
import { createContext, parseBody, router, runMiddlewares } from "@xenra/http";
import { logger } from "@xenra/logger";
import {
  cleanupSocketSession,
  type SocketConnectionData,
  type SocketMessage,
  socketHandler,
  tryUpgradeSocket,
} from "@xenra/socket";
import type { Server, ServerWebSocket } from "bun";
import { handleRouteException } from "./handleRouteException";
import type { AppConfig, ServerType } from "./types";

function resolveController<T>(controller: new (...args: unknown[]) => T): T {
  if (!container.has(controller)) {
    container.add(controller, EContainerScope.Singleton);
  }

  return container.get(controller);
}

export class App {
  readonly config: AppConfig;
  readonly logger: typeof logger = logger;
  private server: ServerType | null = null;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async run(port = 3000): Promise<this> {
    if (this.server) {
      this.logger.warn("Server is already running");
      return this;
    }

    this.server = Bun.serve({
      port,
      fetch: this.handleRequest,
      websocket: {
        perMessageDeflate: true,
        message: async (ws: ServerWebSocket<SocketConnectionData>, message: SocketMessage) => {
          if (!this.server) {
            return;
          }

          await socketHandler({
            ws,
            server: this.server,
            message,
          });
        },
        close: (ws: ServerWebSocket<SocketConnectionData>) => {
          cleanupSocketSession(ws);
        },
      },
      hostname: "0.0.0.0",
    });

    let hostname = this.server.hostname || "0.0.0.0";

    if (hostname === "0.0.0.0") {
      hostname = "localhost";
    }
    const serverUrl = `${this.server.protocol}://${hostname}:${port}`;
    this.logger.success(`Server listening on ${serverUrl}`);
    return this;
  }

  close(): this {
    if (!this.server) {
      this.logger.warn("Server is not running");
      return this;
    }

    this.server.stop();
    this.server = null;
    return this;
  }

  readonly handleRequest: (req: Request, server: Server<SocketConnectionData>) => Promise<Response | undefined> =
    async (req: Request, server: Server<SocketConnectionData>) => {
      const socketUpgradeResult = await tryUpgradeSocket({ req, server });
      if (socketUpgradeResult !== false) {
        return socketUpgradeResult;
      }

      const ctx = createContext(req);

      try {
        ctx.body = await parseBody(ctx);

        const matchedRoute = router.matchHttpRoute(
          ctx.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS",
          ctx.path,
        );
        if (!matchedRoute) {
          return ctx.text("Not Found", { status: 404 });
        }

        ctx.params = matchedRoute.params;

        const route = matchedRoute.route;
        const middlewares = route.middlewares ?? [];

        return await runMiddlewares(ctx, middlewares, async () => {
          const controller = resolveController(route.controller);
          const handler = controller.handler;
          return await handler.call(controller, ctx);
        });
      } catch (err) {
        return handleRouteException(ctx, err);
      }
    };
}
