import { RouterException } from "./exceptions/RouterException";
import type { IRouter, RegisteredHttpRoute, RegisteredRoute, RegisteredSocketRoute } from "./types";
import { matchRoute, matchSocketRoute, type RouteMatch, type SocketRouteMatch } from "./utils/matchRoute";

export class Router implements IRouter {
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
    if (route.isSocket && routes.find((r) => r.isSocket)) {
      throw new RouterException(`Duplicate socket route for path: ${route.path}`);
    }
    const existingByMethod = routes.find((r) => r.method === route.method);

    if (existingByMethod) {
      throw new RouterException(`Duplicate route: ${route.method} ${route.path}`);
    }

    if (!route.isSocket && routes.find((r) => !r.isSocket && r.method === route.method)) {
      throw new RouterException(`Route with path '${route.path}' and method '${route.method}' already exists`);
    }

    routes.push(route);
    this.routes.set(route.path, routes);

    return this;
  }

  public matchHttpRoute(method: RegisteredHttpRoute["method"], path: string): RouteMatch<RegisteredHttpRoute> | null {
    const flatRoutes = Array.from(this.routes.values()).flat();
    return matchRoute(flatRoutes, method, path);
  }

  public matchSocketRoute(path: string): SocketRouteMatch | null {
    const flatRoutes = Array.from(this.routes.values()).flat();
    return matchSocketRoute(path, flatRoutes);
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

  public clear(): void {
    this.routes.clear();
  }

  public getSocketRoutes(): Map<string, RegisteredSocketRoute> {
    const socketRoutes = new Map<string, RegisteredSocketRoute>();

    const paths = this.routes.keys();
    for (const path of paths) {
      const routes = this.routes.get(path) ?? [];
      const socketRoute = routes.find((r): r is RegisteredSocketRoute => r.isSocket === true);

      if (socketRoute) {
        socketRoutes.set(path, socketRoute);
      }
    }

    return socketRoutes;
  }

  public getHttpRoutes(): Map<string, RegisteredHttpRoute[]> {
    const httpRoutes = new Map<string, RegisteredHttpRoute[]>();

    for (const [path, routes] of this.routes) {
      const filteredRoutes = routes.filter((route): route is RegisteredHttpRoute => route.isSocket !== true);
      if (filteredRoutes.length > 0) {
        httpRoutes.set(path, filteredRoutes);
      }
    }

    return httpRoutes;
  }

  public addSocketRoute(route: RegisteredSocketRoute): this {
    return this.addRoute(route);
  }

  public generate<P extends Record<string, string | number> = Record<string, string | number>>(
    name: string,
    params?: P,
  ): string {
    const route = this.findRouteByName(name);

    if (!route) {
      throw new RouterException(`Route not found: ${name}`);
    }

    return route.path.replace(/:([a-zA-Z][a-zA-Z0-9_]*)/g, (_, key: string) => {
      const value = params?.[key];

      if (value === undefined || value === null) {
        throw new RouterException(`Missing route parameter '${key}' for route '${name}'`);
      }

      return encodeURIComponent(String(value));
    });
  }
}

export const router: Router = new Router();
