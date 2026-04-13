import type { Context } from "../types";

export function createContext(req: Request): Context {
  const url = new URL(req.url);

  return {
    req,
    url,
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    params: {},

    json: (data, init) =>
      new Response(JSON.stringify(data), {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      }),

    text: (data, init) => new Response(data, init),
    html: (data, init) =>
      new Response(data, { ...init, headers: { "Content-Type": "text/html", ...(init?.headers || {}) } }),
  };
}
