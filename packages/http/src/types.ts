import type { IValidator, RouteValidators } from "@xenra/decorators";
import type { RouteMatch } from "./utils/matchRoute";

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

export type ContextFromValidators<TValidators extends RouteValidators | undefined = undefined> = Context<
  InferValidated<TValidators>
>;

export interface RouteHandler<TValidated extends ValidatedData = ValidatedData> {
  handler: (ctx: Context<TValidated>) => Promise<Response>;
}

export type ControllerInstance<TValidated extends ValidatedData = ValidatedData> = RouteHandler<TValidated>;
export type IController<TValidated extends ValidatedData = ValidatedData> = new (
  ...args: unknown[]
) => ControllerInstance<TValidated>;

export interface RegisteredRoute {
  name: string;
  method: HTTPMethod;
  path: string;
  handler: string;
  validators?: RouteValidators;
  controller: IController;
  middlewares?: Middleware[];
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

export type Middleware<TContext extends Context = Context> = (
  ctx: TContext,
  next: () => Promise<Response>,
) => Promise<Response>;
