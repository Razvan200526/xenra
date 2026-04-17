import "reflect-metadata";
import {
  type Context,
  createValidationMiddleware,
  type HTTPMethod,
  type IController,
  type InferValidated,
  type Middleware,
  router,
} from "@xenra/http";
import type { RouteValidators } from "./types";
import { isPathValid } from "./utils/isPathValid";

const ROUTE_META = Symbol("route:meta");

export type RouteConfigType<TValidators extends RouteValidators | undefined = undefined> = {
  name: string;
  method?: string;
  path: string;
  validators?: TValidators;
  middlewares?: Middleware<Context<InferValidated<TValidators>>>[];
  description?: string;
};

export type RouteMetadata<TValidators extends RouteValidators | undefined = undefined> =
  RouteConfigType<TValidators> & {
    method: HTTPMethod;
  };

export function createRouteDecorator(method: HTTPMethod) {
  return <TValidators extends RouteValidators | undefined = undefined>(
    options: RouteConfigType<TValidators>,
  ): ClassDecorator => {
    return (target) => {
      if (!isPathValid(options.path, target.name)) {
        process.exit(1);
      }

      const meta: RouteMetadata<TValidators> = {
        ...options,
        method,
      };

      Reflect.defineMetadata(ROUTE_META, meta, target);

      const route = {
        name: meta.name,
        method: meta.method,
        path: meta.path,
        handler: "handler",
        controller: target as unknown as IController,
        middlewares: [...(meta.middlewares ?? []), createValidationMiddleware(meta)] as Middleware[],
        ...(meta.validators ? { validators: meta.validators } : {}),
      };

      router.addRoute(route);
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

export function getRouteMetadata<TValidators extends RouteValidators | undefined = undefined>(
  target: object,
): RouteMetadata<TValidators> | undefined {
  return Reflect.getMetadata(ROUTE_META, target);
}
