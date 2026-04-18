import { routeRegex } from "./constants";
import { RouteDefinitionException } from "./exceptions/RouteDefinitionException";
import type {
  HttpMethod,
  IController,
  InferValidated,
  RegisteredHttpRoute,
  RegisteredSocketRoute,
  RouteConfigType,
  RouteValidators,
  SocketContextLike,
  SocketControllerClass,
  SocketHandlerResponse,
  SocketRouteConfigType,
} from "./types";
import { createValidationMiddleware } from "./utils/createValidationMiddleware";

export type HttpRouteMetadata<TValidators extends RouteValidators | undefined = undefined> =
  RouteConfigType<TValidators> & {
    method: HttpMethod;
  };

export type SocketRouteMetadata<TValidators extends RouteValidators | undefined = undefined> =
  SocketRouteConfigType<TValidators> & {
    method: "SOCKET";
  };

export type RouteMetadata<TValidators extends RouteValidators | undefined = undefined> =
  | HttpRouteMetadata<TValidators>
  | SocketRouteMetadata<TValidators>;

type DefinedRoute<TMeta, TRoute> = {
  meta: TMeta;
  route: TRoute;
};

export function validateRoutePath(path: string, controllerName: string): string {
  if (!routeRegex.test(path)) {
    throw new RouteDefinitionException(`Invalid path on ${controllerName}, input -> ${path}`);
  }

  return path;
}

export function defineHttpRoute<TValidators extends RouteValidators | undefined = undefined>(
  controller: IController<InferValidated<TValidators>>,
  method: HttpMethod,
  options: RouteConfigType<TValidators>,
): DefinedRoute<HttpRouteMetadata<TValidators>, RegisteredHttpRoute> {
  // biome-ignore lint/complexity/noBannedTypes: <trust me>
  validateRoutePath(options.path, (controller as Function).name || "AnonymousController");

  const meta: HttpRouteMetadata<TValidators> = {
    ...options,
    method,
  };

  const middlewares = [...(meta.middlewares ?? [])];

  if (meta.validators) {
    middlewares.push(createValidationMiddleware(meta.validators));
  }

  return {
    meta,
    route: {
      name: meta.name,
      method: meta.method,
      path: meta.path,
      controller,
      ...(meta.validators ? { validators: meta.validators } : {}),
      ...(middlewares.length > 0 ? { middlewares } : {}),
      isSocket: false,
    },
  };
}

export function defineSocketRoute<TValidators extends RouteValidators | undefined = undefined>(
  // biome-ignore lint/suspicious/noExplicitAny: <trust me>
  controller: SocketControllerClass<any, InferValidated<TValidators>>,
  options: SocketRouteConfigType<TValidators>,
): DefinedRoute<SocketRouteMetadata<TValidators>, RegisteredSocketRoute> {
  // biome-ignore lint/complexity/noBannedTypes: <trust me>
  validateRoutePath(options.path, (controller as Function).name || "AnonymousController");

  const meta: SocketRouteMetadata<TValidators> = {
    ...options,
    method: "SOCKET",
  };

  const middlewares = [...(meta.middlewares ?? [])];

  if (meta.validators) {
    middlewares.push(
      createValidationMiddleware<
        TValidators,
        // biome-ignore lint/suspicious/noExplicitAny: <trust me>
        SocketContextLike<any, InferValidated<TValidators>>,
        SocketHandlerResponse
      >(meta.validators),
    );
  }

  return {
    meta,
    route: {
      name: meta.name,
      method: "SOCKET",
      path: meta.path,
      controller,
      ...(meta.validators ? { validators: meta.validators } : {}),
      ...(middlewares.length > 0 ? { middlewares } : {}),
      isSocket: true,
    },
  };
}
