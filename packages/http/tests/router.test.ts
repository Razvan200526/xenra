import { describe, expect, test } from "bun:test";
import { RouterException } from "../src/exceptions/RouterException";
import { Router } from "../src/Router";
import type { Context, SocketContextLike } from "../src/types";

class HelloController {
  handler(ctx: Context) {
    return ctx.json({ ok: true });
  }
}

class OtherController {
  handler(ctx: Context) {
    return ctx.json({ ok: true, path: ctx.path });
  }
}

class ChatController {
  handler(ctx: SocketContextLike) {
    return ctx.json({ ok: true, route: ctx.route.name });
  }
}

describe("@xenra/http Router", () => {
  test("tracks routes by path, by name, and by protocol type", () => {
    const router = new Router();

    router.addRoute({
      name: "hello.index",
      method: "GET",
      path: "/hello",
      controller: HelloController,
      middlewares: [],
    });
    router.addRoute({
      name: "hello.update",
      method: "PATCH",
      path: "/hello",
      controller: OtherController,
      middlewares: [],
    });
    router.addSocketRoute({
      name: "chat.socket",
      method: "SOCKET",
      path: "/ws",
      controller: ChatController,
      middlewares: [],
      isSocket: true,
    });

    expect(router.findRouteByName("hello.index")?.path).toBe("/hello");
    expect(router.findRouteByPath("/hello")).toHaveLength(2);
    expect(Array.from(router.getHttpRoutes().keys())).toEqual(["/hello"]);
    expect(Array.from(router.getSocketRoutes().keys())).toEqual(["/ws"]);
    expect(router.matchHttpRoute("PATCH", "/hello")?.route.name).toBe("hello.update");
    expect(router.matchSocketRoute("/ws")?.route.name).toBe("chat.socket");
  });

  test("generate interpolates and encodes route params", () => {
    const router = new Router();

    router.addRoute({
      name: "users.show",
      method: "GET",
      path: "/users/:id/:slug",
      controller: HelloController,
      middlewares: [],
    });

    expect(router.generate("users.show", { id: 10, slug: "alex smith" })).toBe("/users/10/alex%20smith");
  });

  test("generate throws when the route is missing or a param is missing", () => {
    const router = new Router();

    router.addRoute({
      name: "users.show",
      method: "GET",
      path: "/users/:id",
      controller: HelloController,
      middlewares: [],
    });

    expect(() => router.generate("missing")).toThrow(RouterException);
    expect(() => router.generate("users.show")).toThrow("Missing route parameter 'id'");
  });

  test("rejects duplicate names, duplicate methods, and duplicate socket paths", () => {
    const router = new Router();

    router.addRoute({
      name: "hello.index",
      method: "GET",
      path: "/hello",
      controller: HelloController,
      middlewares: [],
    });

    expect(() =>
      router.addRoute({
        name: "hello.index",
        method: "POST",
        path: "/hello-again",
        controller: OtherController,
        middlewares: [],
      }),
    ).toThrow(RouterException);

    expect(() =>
      router.addRoute({
        name: "hello.index.post",
        method: "GET",
        path: "/hello",
        controller: OtherController,
        middlewares: [],
      }),
    ).toThrow(RouterException);

    router.addSocketRoute({
      name: "chat.socket",
      method: "SOCKET",
      path: "/ws",
      controller: ChatController,
      middlewares: [],
      isSocket: true,
    });

    expect(() =>
      router.addSocketRoute({
        name: "chat.socket.second",
        method: "SOCKET",
        path: "/ws",
        controller: ChatController,
        middlewares: [],
        isSocket: true,
      }),
    ).toThrow(RouterException);
  });

  test("clear removes all registered routes", () => {
    const router = new Router();

    router.addRoute({
      name: "hello.index",
      method: "GET",
      path: "/hello",
      controller: HelloController,
      middlewares: [],
    });

    router.clear();

    expect(router.getRoutes().size).toBe(0);
    expect(router.findRouteByName("hello.index")).toBeNull();
  });
});
