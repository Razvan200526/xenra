/** biome-ignore-all lint/suspicious/noConsole: <until websocket implementation> */
/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <until websocket implementation> */

import { createContext, parseBody, router } from "@xenra/http";
import type { AppConfig, ServerType } from "../types";
import { getRouteMetadata, Logger } from "@xenra/decorators";
import type { logger } from "@xenra/logger";

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
    ctx.body = await parseBody(ctx);

    const matchedRoute = router.match(ctx.method, ctx.path);
    if (!matchedRoute) {
      return new Response("Not Found", { status: 404 });
    }

    ctx.params = matchedRoute.params;

    const meta = getRouteMetadata(matchedRoute.route.controller);
    if (!meta) {
      return new Response("Route metadata missing", { status: 500 });
    }

    if (meta.validators?.query) {
      ctx.validated.query = await meta.validators.query.validate(ctx.query);
    }

    if (meta.validators?.body) {
      ctx.validated.body = await meta.validators.body.validate(ctx.body);
    }

    if (meta.validators?.params) {
      ctx.validated.params = await meta.validators.params.validate(ctx.params);
    }

    return await matchedRoute.route.handler(ctx);
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
