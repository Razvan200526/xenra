import "reflect-metadata";
import {
  defineHttpRoute,
  defineSocketRoute,
  type HttpMethod,
  type IController,
  type InferValidated,
  type RouteMetadata,
  router,
  type SocketControllerClass,
} from "@xenra/http";
import type { RouteConfigType, RouteValidators, SocketRouteConfigType } from "./types";

const ROUTE_META = Symbol("route:meta");

type HttpRouteDecorator = <TValidators extends RouteValidators | undefined = undefined>(
  options: RouteConfigType<TValidators>,
) => ClassDecorator;

type SocketRouteDecorator = <TValidators extends RouteValidators | undefined = undefined>(
  options: SocketRouteConfigType<TValidators>,
) => ClassDecorator;

type RouteDecoratorApi = {
  get: HttpRouteDecorator;
  post: HttpRouteDecorator;
  put: HttpRouteDecorator;
  delete: HttpRouteDecorator;
  patch: HttpRouteDecorator;
  socket: SocketRouteDecorator;
};

function createHttpRouteDecorator(method: HttpMethod): HttpRouteDecorator {
  return <TValidators extends RouteValidators | undefined = undefined>(
    options: RouteConfigType<TValidators>,
  ): ClassDecorator => {
    return (target) => {
      const { meta, route } = defineHttpRoute(
        target as unknown as IController<InferValidated<TValidators>>,
        method,
        options,
      );

      Reflect.defineMetadata(ROUTE_META, meta, target);
      router.addRoute(route);
    };
  };
}

function createSocketRouteDecorator(): SocketRouteDecorator {
  return <TValidators extends RouteValidators | undefined = undefined>(options: SocketRouteConfigType<TValidators>) => {
    return (target) => {
      const { meta, route } = defineSocketRoute(
        // biome-ignore lint/suspicious/noExplicitAny: <trust me>
        target as unknown as SocketControllerClass<any, InferValidated<TValidators>>,
        options,
      );

      Reflect.defineMetadata(ROUTE_META, meta, target);
      router.addSocketRoute(route);
    };
  };
}

export const Route: RouteDecoratorApi = {
  get: createHttpRouteDecorator("GET"),
  post: createHttpRouteDecorator("POST"),
  put: createHttpRouteDecorator("PUT"),
  delete: createHttpRouteDecorator("DELETE"),
  patch: createHttpRouteDecorator("PATCH"),
  socket: createSocketRouteDecorator(),
};

export function getRouteMetadata<TValidators extends RouteValidators | undefined = undefined>(
  target: object,
): RouteMetadata<TValidators> | undefined {
  return Reflect.getMetadata(ROUTE_META, target);
}
