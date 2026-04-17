/** biome-ignore-all lint/suspicious/noUnsafeDeclarationMerging: <logger util> */

import { container, EContainerScope } from "@xenra/container";
import { logger } from "@xenra/logger";
import { RouterException } from "./exceptions/RouterException";
import type { IRouter, RegisteredRoute } from "./types";
import { matchRoute, type RouteMatch } from "./utils/matchRoute";

export interface Router extends IRouter {
  logger: typeof logger;
}

export class Router implements IRouter {
  public logger = logger;
  private routes: Map<string, RegisteredRoute[]> = new Map();

  public addRoute(route: RegisteredRoute): this {
    const name = route.name;

    for (const [, registeredRoutes] of this.routes) {
      const existingByName = registeredRoutes.find((r) => r.name === name);

      if (existingByName) {
        throw new RouterException(`Duplicate route name: ${name}`);
      }
    }

    const routes = this.routes.get(route.path) ?? [];
    const existingByMethod = routes.find((r) => r.method === route.method);

    if (existingByMethod) {
      throw new RouterException(`Duplicate route: ${route.method} ${route.path}`);
    }

    routes.push(route);
    this.routes.set(route.path, routes);
    container.add(route.controller, EContainerScope.Singleton);

    return this;
  }

  public match(method: string, path: string): RouteMatch | null {
    const flatRoutes = Array.from(this.routes.values()).flat();
    return matchRoute(flatRoutes, method, path);
  }

  public findRouteByPath(path: string): RegisteredRoute[] | null {
    return this.routes.get(path) ?? null;
  }

  public findRouteByName(name: string): RegisteredRoute | null {
    for (const [, routes] of this.routes) {
      const existingRoute = routes.find((r) => r.name === name);

      if (existingRoute) {
        return existingRoute;
      }
    }

    return null;
  }

  public getRoutes(): Map<string, RegisteredRoute[]> {
    return this.routes;
  }
}

export const router = new Router();
