import type { RegisteredHttpRoute, RegisteredRoute, RegisteredSocketRoute } from "../types";

export type RouteMatch<TRoute extends RegisteredRoute = RegisteredRoute> = {
  route: TRoute;
  params: Record<string, string>;
};

function normalizePath(path: string): string {
  if (path === "/") {
    return path;
  }

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function getPathSegments(path: string): string[] {
  return normalizePath(path).split("/").filter(Boolean);
}

function getRouteParams(routePath: string, requestPath: string): Record<string, string> | null {
  const routeSegments = getPathSegments(routePath);
  const requestSegments = getPathSegments(requestPath);

  if (routeSegments.length !== requestSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (const [index, routeSegment] of routeSegments.entries()) {
    const requestSegment = requestSegments[index];
    if (!requestSegment) {
      return null;
    }

    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
      continue;
    }

    if (routeSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

export function matchRoute(
  routes: RegisteredRoute[] | undefined,
  method: string,
  path: string,
): RouteMatch<RegisteredHttpRoute> | null {
  const normalizedMethod = method.toUpperCase();
  for (const route of routes ?? []) {
    if (route.isSocket || route.method !== normalizedMethod) {
      continue;
    }

    const params = getRouteParams(route.path, path);
    if (params) {
      return { route, params };
    }
  }

  return null;
}

export type SocketRouteMatch = RouteMatch<RegisteredSocketRoute>;
export function matchSocketRoute(path: string, routes?: RegisteredRoute[]): SocketRouteMatch | null {
  for (const route of routes ?? []) {
    if (!route.isSocket) {
      continue;
    }

    const params = getRouteParams(route.path, path);
    if (params) {
      return { route, params };
    }
  }

  return null;
}
