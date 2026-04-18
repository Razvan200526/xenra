/** biome-ignore-all lint/suspicious/noExplicitAny: <trust me> */
import type { RouteMatch, SocketRouteMatch } from "./utils/matchRoute";

export interface IValidator<TInput = unknown, TOutput = TInput> {
  validate(input: TInput): TOutput | Promise<TOutput>;
}

export type RouteValidators = Partial<{
  body: IValidator<unknown, unknown>;
  query: IValidator<unknown, unknown>;
  params: IValidator<unknown, unknown>;
}>;

type InferValidatorOutput<TValidator> =
  TValidator extends IValidator<unknown, infer TOutput> ? Awaited<TOutput> : unknown;

type InferValidatedValue<TValidators extends RouteValidators | undefined, TKey extends keyof RouteValidators> =
  TValidators extends Record<TKey, infer TValidator> ? InferValidatorOutput<TValidator> : unknown;

export type ValidatedData = {
  body: unknown;
  query: unknown;
  params: unknown;
};

export type InferValidated<TValidators extends RouteValidators | undefined = undefined> = ValidatedData & {
  body: InferValidatedValue<TValidators, "body">;
  query: InferValidatedValue<TValidators, "query">;
  params: InferValidatedValue<TValidators, "params">;
};

export type Context<TValidated extends ValidatedData = ValidatedData> = {
  req: Request;
  url: URL;

  method: string;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  body?: unknown;
  bodyParsed: boolean;
  validated: TValidated;

  json: (data: unknown, init?: ResponseInit) => Response;
  text: (data: string, init?: ResponseInit) => Response;
  html: (data: string, init?: ResponseInit) => Response;
};

export type Middleware<TContext extends Context = Context, TResult = Response> = (
  ctx: TContext,
  next: () => Promise<TResult>,
) => Promise<TResult>;

export type ContextFromValidators<TValidators extends RouteValidators | undefined = undefined> = Context<
  InferValidated<TValidators>
>;

export interface Handler<TContext = Context, TResult = Response> {
  handler: (ctx: TContext) => Promise<TResult> | TResult;
}

export type ControllerInstance<TContext = Context, TResult = Response> = Handler<TContext, TResult>;
export type ControllerClass<TContext = Context, TResult = Response> = new (
  ...args: unknown[]
) => ControllerInstance<TContext, TResult>;

export type IController<TValidated extends ValidatedData = ValidatedData> = ControllerClass<
  Context<TValidated>,
  Response
>;

// biome-ignore lint/suspicious/noConfusingVoidType: <trust me>
export type SocketHandlerResponse = Response | void;

export type SocketChannel = {
  send: (response: Response) => Promise<void>;
  close(code?: number, reason?: string): void;
  subscribe: () => Promise<void>;
  isSubscribed(): boolean;
  unsubscribe: () => Promise<void>;
  publish: (response: Response) => Promise<void>;
};

export type SocketContextLike<TData = any, TValidated extends ValidatedData = ValidatedData> = Context<TValidated> & {
  message: string;
  route: {
    name: string;
    path: string;
    method: "SOCKET";
    isSocket: true;
  };
  data: TData;
  channel: SocketChannel;
};

export type SocketMiddlewareLike<TData = any, TValidated extends ValidatedData = ValidatedData> = Middleware<
  SocketContextLike<TData, TValidated>,
  SocketHandlerResponse
>;

export type SocketController<TData = any, TValidated extends ValidatedData = ValidatedData> = Handler<
  SocketContextLike<TData, TValidated>,
  SocketHandlerResponse
>;

export type SocketControllerClass<TData = any, TValidated extends ValidatedData = ValidatedData> = ControllerClass<
  SocketContextLike<TData, TValidated>,
  SocketHandlerResponse
>;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type HTTPMethod = HttpMethod | "SOCKET";

export type RouteConfigType<TValidators extends RouteValidators | undefined = undefined> = {
  name: string;
  method?: string;
  path: string;
  validators?: TValidators;
  middlewares?: Middleware<Context<InferValidated<TValidators>>>[];
  description?: string;
};

export type SocketRouteConfigType<TValidators extends RouteValidators | undefined = undefined> = {
  name: string;
  method?: string;
  path: string;
  validators?: TValidators;
  middlewares?: Middleware<SocketContextLike<any, InferValidated<TValidators>>, SocketHandlerResponse>[];
  description?: string;
};

type RegisteredRouteBase = {
  name: string;
  path: string;
  validators?: RouteValidators;
};

export interface RegisteredHttpRoute extends RegisteredRouteBase {
  method: HttpMethod;
  controller: IController<any>;
  middlewares?: Middleware<any, Response>[];
  isSocket?: false;
}

export interface RegisteredSocketRoute extends RegisteredRouteBase {
  method: "SOCKET";
  controller: SocketControllerClass<any, any>;
  middlewares?: SocketMiddlewareLike<any, any>[];
  isSocket: true;
}

export type RegisteredRoute = RegisteredHttpRoute | RegisteredSocketRoute;

export interface IRouter {
  addRoute: (route: RegisteredRoute) => this;
  addSocketRoute: (route: RegisteredSocketRoute) => this;
  findRouteByPath: (path: string) => RegisteredRoute[] | null;
  findRouteByName: (name: string) => RegisteredRoute | null;
  getRoutes: () => Map<string, RegisteredRoute[]>;
  matchHttpRoute: (method: HttpMethod, path: string) => RouteMatch<RegisteredHttpRoute> | null;
  matchSocketRoute: (path: string) => SocketRouteMatch | null;
  getSocketRoutes: () => Map<string, RegisteredSocketRoute>;
  getHttpRoutes: () => Map<string, RegisteredHttpRoute[]>;
  generate: <P extends Record<string, string | number> = Record<string, string | number>>(
    name: string,
    params?: P,
  ) => string;
}
