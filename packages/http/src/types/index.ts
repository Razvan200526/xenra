export type Context = {
  req: Request;
  url: URL;

  method: string;
  path: string;
  query: Record<string, string>;

  body?: unknown;

  params: Record<string, string>;

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
  method: HTTPMethod;
  path: string;
  handler: RouteHandler["handler"];
  controller: IController;
}

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
