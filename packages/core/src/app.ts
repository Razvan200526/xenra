/** biome-ignore-all lint/suspicious/noConsole: <until websocket implementation> */
/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <until websocket implementation> */

import { getRouteMetadata, Logger } from "@xenra/decorators";
import { createContext, createValidationMiddleware, parseBody, router, runMiddlewares } from "@xenra/http";
import type { logger } from "@xenra/logger";
import type { AppConfig, ServerType } from "./types";
import { handleRouteException } from "./handleRouteException";
export interface App {
  logger: typeof logger;
}

@Logger
export class App {
  readonly config: AppConfig;
  private server: ServerType | null = null;

  constructor(config: AppConfig) {
    this.config = config;
    this.registerRoutes();
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

      const meta = getRouteMetadata(matchedRoute.route.controller);
      if (!meta) {
        this.logger.error(`Missing route metadata for ${matchedRoute.route.controller.name}`);

        return ctx.text("Internal Server Error", { status: 500 });
      }

      const middlewares = [createValidationMiddleware(meta), ...(meta.middlewares ?? [])];

      return await runMiddlewares(ctx, middlewares, () => matchedRoute.route.handler(ctx));
    } catch (err) {
      return handleRouteException(ctx, err);
    }
  };
  registerRoutes() {
    for (const Controller of this.config.controllers) {
      const meta = getRouteMetadata(Controller);

      if (!meta) {
        this.logger.exception(new Error(`Controller ${Controller.name} has no route metadata`));
        continue;
      }

      const instance = new Controller();

      router.addRoute({
        name: meta.name,
        method: meta.method,
        path: meta.path,
        handler: instance.handler.bind(instance),
        controller: Controller,
      });
    }
  }
}
