/** biome-ignore-all lint/suspicious/noConsole: <until websocket implementation> */
/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <until websocket implementation> */

import { createContext, parseBody, type RegisteredRoute } from "@xenra/http";
import type { AppConfig, ServerType } from "../types";
import { getRouteMetadata, Logger } from "@xenra/decorators";
import type { logger } from "../../logger/src/logger";

export interface App {
  logger: typeof logger;
}

@Logger
export class App {
  readonly config: AppConfig;
  readonly server: ServerType;
  routes?: RegisteredRoute[];

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

  private readonly handleRequest = async (req: Request) => {
    const ctx = createContext(req);
    ctx.body = await parseBody(ctx);

    const route = this.routes?.find((candidate) => candidate.method === ctx.method && candidate.path === ctx.path);
    if (!route) {
      return new Response("Not Found", { status: 404 });
    }

    return await route.handler(ctx);
  };

  registerRoutes() {
    this.routes = this.config.controllers.flatMap((Controller) => {
      const meta = getRouteMetadata(Controller);
      const instance = new Controller();
      if (!meta) {
        this.logger.exception(new Error(`Controller ${Controller.name} has no route metadata`));
        return [];
      }
      return {
        method: meta.method,
        path: meta.path,
        handler: instance.handler.bind(instance),
        controller: Controller,
      };
    });
  }
}
