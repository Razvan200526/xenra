/** biome-ignore-all lint/suspicious/noConsole: <until websocket implementation> */
/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <until websocket implementation> */

import { container } from "@xenra/container";
import { Logger } from "@xenra/decorators";
import { createContext, parseBody, router, runMiddlewares } from "@xenra/http";
import type { logger } from "@xenra/logger";
import { handleRouteException } from "./handleRouteException";
import type { AppConfig, ServerType } from "./types";
export interface App {
  logger: typeof logger;
}

@Logger
export class App {
  readonly config: AppConfig;
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

  readonly handleRequest = async (req: Request) => {
    const ctx = createContext(req);

    try {
      ctx.body = await parseBody(ctx);

      const matchedRoute = router.match(ctx.method, ctx.path);
      if (!matchedRoute) {
        return ctx.text("Not Found", { status: 404 });
      }

      ctx.params = matchedRoute.params;

      const route = matchedRoute.route;
      const middlewares = route.middlewares ?? [];

      return await runMiddlewares(ctx, middlewares, async () => {
        const controller = container.get(route.controller);

        const handler = controller.handler;
        return await handler.call(controller, ctx);
      });
    } catch (err) {
      return handleRouteException(ctx, err);
    }
  };
}
