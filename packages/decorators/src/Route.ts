import "reflect-metadata";
import type { HTTPMethod } from "@xenra/http";

const ROUTE_META = Symbol("route:meta");

type RouteConfig = {
  path: string;
  request?: unknown;
  response?: unknown;
  middlwares?: unknown[];
  description?: string;
};

export function createRouteDecorator(method: HTTPMethod) {
  return (options: string | RouteConfig): ClassDecorator => {
    return (target) => {
      const config = typeof options === "string" ? { path: options } : options;

      Reflect.defineMetadata(
        ROUTE_META,
        {
          method,
          ...config,
        },
        target,
      );
    };
  };
}

export const Route = {
  get: createRouteDecorator("GET"),
  post: createRouteDecorator("POST"),
  put: createRouteDecorator("PUT"),
  delete: createRouteDecorator("DELETE"),
  patch: createRouteDecorator("PATCH"),
};

// biome-ignore lint/complexity/noBannedTypes: <constructor>
export function getRouteMetadata(target: Function) {
  return Reflect.getMetadata(ROUTE_META, target);
}
