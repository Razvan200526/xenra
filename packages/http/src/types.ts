import type { RouteMatch } from "./utils/matchRoute";

export type Context = {
  req: Request;
  url: URL;

  method: string;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  body?: unknown;
  bodyParsed: boolean;

  validated: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  };

  json: (data: unknown, init?: ResponseInit) => Response;
  text: (data: string, init?: ResponseInit) => Response;
  html: (data: string, init?: ResponseInit) => Response;
};

export interface RouteHandler {
  handler: (ctx: Context) => Response | Promise<Response>;
}

export type ControllerInstance = RouteHandler;
// biome-ignore lint/suspicious/noExplicitAny: <trust me>
export type IController = new (...args: any[]) => ControllerInstance;

export interface RegisteredRoute {
  name: string;
  method: HTTPMethod;
  path: string;
  handler: RouteHandler["handler"];
  controller: IController;
}

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export interface IRouter {
  addRoute: (route: RegisteredRoute) => this;
  findRouteByPath: (path: string) => RegisteredRoute[] | null;
  findRouteByName: (name: string) => RegisteredRoute | null;
  getRoutes: () => Map<string, RegisteredRoute[]>;
  match: (path: string, method: HTTPMethod) => RouteMatch | null;
  getSocketRoutes?: () => Map<string, RegisteredRoute>;
  getHttpRoutes: () => Map<string, RegisteredRoute[]>;
  generate: <P extends Record<string, string | number> = Record<string, string | number>>(
    name: string,
    params?: P,
  ) => string;
}
