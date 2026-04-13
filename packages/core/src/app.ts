/** biome-ignore-all lint/suspicious/noConsole: <until websocket implementation> */
/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <until websocket implementation> */

import { createContext, createValidationMiddleware, parseBody, router, runMiddlewares } from "@xenra/http";
import type { AppConfig, ServerType } from "../types";
import { getRouteMetadata, Logger } from "@xenra/decorators";
import type { logger } from "@xenra/logger";
import { HttpException } from "@xenra/exceptions";
export interface App {
  logger: typeof logger;
}

@Logger
export class App {
  readonly config: AppConfig;
  readonly server: ServerType;

  constructor(config: AppConfig) {
    this.config = config;
    this.registerRoutes();

    this.server = Bun.serve({
      port: 3000,
      websocket: {
        open: () => {
          console.log("Client connected");
        },
        message: (message) => {
          console.log("Client sent message", message);
        },
        close: () => {
          console.log("Client disconnected");
        },
      },
      fetch: this.handleRequest,
      hostname: "0.0.0.0",
    });
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
      if (err instanceof HttpException) {
        this.logger.warn(err.message);

        return ctx.json(
          {
            error: err.message,
          },
          { status: err.status_code ?? 400 },
        );
      }

      this.logger.exception(err);

      return ctx.json(
        {
          error: "Internal Server Error",
        },
        { status: 500 },
      );
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
