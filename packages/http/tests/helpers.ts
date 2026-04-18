import type { Context, RegisteredRoute } from "../src/types";

export function createMockContext(overrides?: Partial<Context>): Context {
  return {
    req: new Request("http://localhost/test"),
    url: new URL("http://localhost/test"),
    method: "GET",
    path: "/test",
    query: {},
    params: {},
    body: undefined,
    bodyParsed: true,
    validated: {
      body: undefined,
      query: undefined,
      params: undefined,
    },
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      }),
    text: (data: string, init?: ResponseInit) => new Response(data, init),
    html: (data: string, init?: ResponseInit) =>
      new Response(data, {
        ...init,
        headers: {
          "Content-Type": "text/html",
          ...(init?.headers ?? {}),
        },
      }),
    ...overrides,
  };
}

export function createRoute(
  overrides: Partial<RegisteredRoute> & Pick<RegisteredRoute, "name" | "method" | "path" | "controller">,
): RegisteredRoute {
  return {
    ...overrides,
  } as RegisteredRoute;
}
