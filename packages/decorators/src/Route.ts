import "reflect-metadata";
import type { HTTPMethod } from "@xenra/http";
import { isPathValid } from "./utils/isPathValid";
import type { IValidator } from "./types";
const ROUTE_META = Symbol("route:meta");

export type RouteConfigType = {
  name: string;
  method?: string;
  path: string;
  validators?: {
    body?: IValidator;
    query?: IValidator;
    params?: IValidator;
  };
  middlwares?: unknown[];
  description?: string;
};

export type RouteMetadata = RouteConfigType & { method: HTTPMethod };
export function createRouteDecorator(method: HTTPMethod) {
  return (options: RouteConfigType): ClassDecorator => {
    const { path } = options;
    options.method = method;
    return (target) => {
      if (!isPathValid(path, target.name)) {
        process.exit(1);
      }

      Reflect.defineMetadata(
        ROUTE_META,
        {
          ...options,
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
export function getRouteMetadata(target: Function): RouteMetadata {
  return Reflect.getMetadata(ROUTE_META, target);
}
