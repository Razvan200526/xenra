import { beforeEach, describe, expect, test } from "bun:test";
import type { Context, SocketContextLike } from "@xenra/http";
import { RouteDefinitionException, RouterException, router } from "@xenra/http";
import { getRouteMetadata, Route } from "../src/Route";

describe("@xenra/decorators Route", () => {
  beforeEach(() => {
    router.clear();
  });

  test("Route.get stores metadata and registers the route", () => {
    class HelloController {
      handler(ctx: Context) {
        return ctx.json({ ok: true });
      }
    }

    Route.get({ name: "hello.index", path: "/" })(HelloController);

    const metadata = getRouteMetadata(HelloController);
    const match = router.matchHttpRoute("GET", "/");

    expect(metadata).toEqual({
      name: "hello.index",
      path: "/",
      method: "GET",
    });
    expect(match?.route.controller).toBe(HelloController);
  });

  test("Route.post preserves description, validators, and middleware ordering", async () => {
    const calls: string[] = [];

    class CreateController {
      handler(ctx: Context) {
        calls.push(`handler:${ctx.method}`);
        return ctx.json({ ok: true });
      }
    }

    Route.post({
      name: "create.item",
      path: "/items",
      description: "Creates an item",
      middlewares: [
        async (ctx, next) => {
          calls.push(`before:${ctx.path}`);
          const response = await next();
          calls.push(`after:${response.status}`);
          return response;
        },
      ],
    })(CreateController);

    const match = router.matchHttpRoute("POST", "/items");
    const metadata = getRouteMetadata(CreateController);

    expect(metadata).toEqual({
      name: "create.item",
      path: "/items",
      description: "Creates an item",
      middlewares: metadata?.middlewares,
      method: "POST",
    });
    expect(match?.route.middlewares).toHaveLength(1);

    const ctx = {
      req: new Request("http://localhost/items", { method: "POST" }),
      url: new URL("http://localhost/items"),
      method: "POST",
      path: "/items",
      query: {},
      params: {},
      body: undefined,
      bodyParsed: true,
      validated: { body: undefined, query: undefined, params: undefined },
      json: (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), init),
      text: (data: string, init?: ResponseInit) => new Response(data, init),
      html: (data: string, init?: ResponseInit) => new Response(data, init),
    } satisfies Context;

    const response = await match?.route.middlewares?.[0]?.(ctx, async () =>
      match.route.controller.prototype.handler(ctx),
    );

    expect(response?.status).toBe(200);
    expect(calls).toEqual(["before:/items", "handler:POST", "after:200"]);
  });

  test("Route.socket stores metadata and registers the socket route", () => {
    class ChatController {
      handler(ctx: SocketContextLike) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "chat.socket", path: "/ws" })(ChatController);

    const metadata = getRouteMetadata(ChatController);
    const match = router.matchSocketRoute("/ws");

    expect(metadata).toEqual({
      name: "chat.socket",
      path: "/ws",
      method: "SOCKET",
    });
    expect(match?.route.controller).toBe(ChatController);
    expect(match?.route.isSocket).toBe(true);
  });

  test("throws on invalid decorator configuration instead of exiting the process", () => {
    class BadController {
      handler(ctx: Context) {
        return ctx.json({ ok: false });
      }
    }

    expect(() => Route.get({ name: "bad.route", path: "missing-leading-slash" })(BadController)).toThrow(
      RouteDefinitionException,
    );
  });

  test("bubbles duplicate route registration errors", () => {
    class FirstController {
      handler(ctx: Context) {
        return ctx.json({ ok: true });
      }
    }

    class SecondController {
      handler(ctx: Context) {
        return ctx.json({ ok: true });
      }
    }

    Route.get({ name: "duplicate.route", path: "/dup" })(FirstController);

    expect(() => Route.get({ name: "duplicate.route", path: "/dup-2" })(SecondController)).toThrow(RouterException);
  });
});
