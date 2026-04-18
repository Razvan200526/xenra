import { describe, expect, test } from "bun:test";
import { RouteDefinitionException } from "../src/exceptions/RouteDefinitionException";
import { RouterException } from "../src/exceptions/RouterException";
import { Router } from "../src/Router";
import { defineHttpRoute, defineSocketRoute, validateRoutePath } from "../src/routes";
import type { Context, IValidator, SocketContextLike } from "../src/types";
import { createMockContext } from "./helpers";

class IdentityValidator implements IValidator {
  validate(input: unknown) {
    return input;
  }
}

class ThrowingValidator implements IValidator {
  validate(): never {
    throw new Error("validator failed");
  }
}

class HelloController {
  handler(ctx: Context) {
    return ctx.json({ ok: true, path: ctx.path });
  }
}

class ChatController {
  handler(ctx: SocketContextLike) {
    return ctx.json({ ok: true, route: ctx.route.name });
  }
}

describe("@xenra/http route definitions", () => {
  test("defineHttpRoute appends validation middleware and preserves route metadata", async () => {
    const validators = {
      body: new IdentityValidator(),
    };

    const { meta, route } = defineHttpRoute(HelloController, "POST", {
      name: "hello.create",
      path: "/hello",
      validators,
      description: "Creates a hello response",
    });

    expect(meta).toEqual({
      name: "hello.create",
      path: "/hello",
      validators,
      description: "Creates a hello response",
      method: "POST",
    });
    expect(route.name).toBe("hello.create");
    expect(route.controller).toBe(HelloController);
    expect(route.middlewares).toHaveLength(1);

    const validated = { body: undefined, query: undefined, params: undefined };
    const response = await route.middlewares?.[0]?.(
      createMockContext({
        method: "POST",
        path: "/hello",
        body: { ok: true },
        validated,
      }),
      async () => new Response("ok"),
    );

    expect(response?.status).toBe(200);
    expect(validated.body).toEqual({ ok: true });
  });

  test("defineHttpRoute preserves existing middleware order before validation", async () => {
    const calls: string[] = [];
    const validators = {
      query: new IdentityValidator(),
    };
    const { route } = defineHttpRoute(HelloController, "GET", {
      name: "hello.index",
      path: "/hello",
      validators,
      middlewares: [
        async (ctx, next) => {
          calls.push(`before:${JSON.stringify(ctx.query)}`);
          const response = await next();
          calls.push(`after:${response.status}`);
          return response;
        },
      ],
    });

    const response = await route.middlewares?.[0]?.(
      createMockContext({
        query: {
          page: "1",
        },
      }),
      async () => {
        await route.middlewares?.[1]?.(
          createMockContext({
            query: {
              page: "1",
            },
          }),
          async () => new Response("done"),
        );
        return new Response("done");
      },
    );

    expect(response?.status).toBe(200);
    expect(calls).toEqual(['before:{"page":"1"}', "after:200"]);
  });

  test("defineSocketRoute preserves socket route shape and validation middleware", () => {
    const { meta, route } = defineSocketRoute(ChatController, {
      name: "chat.socket",
      path: "/ws",
      validators: {
        body: new IdentityValidator(),
      },
    });

    expect(meta.method).toBe("SOCKET");
    expect(route.isSocket).toBe(true);
    expect(route.name).toBe("chat.socket");
    expect(route.controller).toBe(ChatController);
    expect(route.middlewares).toHaveLength(1);
  });

  test("validateRoutePath accepts framework-style paths and rejects invalid ones", () => {
    expect(validateRoutePath("/users/:id", "GoodController")).toBe("/users/:id");
    expect(() => validateRoutePath("users", "BadController")).toThrow(RouteDefinitionException);
  });

  test("validation middleware failures bubble through route execution", async () => {
    const { route } = defineHttpRoute(HelloController, "POST", {
      name: "hello.fail",
      path: "/hello/fail",
      validators: {
        body: new ThrowingValidator(),
      },
    });

    await expect(
      route.middlewares?.[0]?.(
        createMockContext({
          method: "POST",
          body: { ok: false },
        }),
        async () => new Response("ok"),
      ),
    ).rejects.toThrow("validator failed");
  });

  test("router rejects duplicate names, duplicate http routes, and duplicate socket routes", () => {
    const router = new Router();
    const firstHttp = defineHttpRoute(HelloController, "GET", {
      name: "hello.show",
      path: "/hello/:id",
    }).route;
    const secondHttp = defineHttpRoute(HelloController, "GET", {
      name: "hello.show",
      path: "/hello/:name",
    }).route;
    const socketRoute = defineSocketRoute(ChatController, {
      name: "chat.socket",
      path: "/ws",
    }).route;

    router.addRoute(firstHttp);

    expect(() => router.addRoute(secondHttp)).toThrow(RouterException);

    router.addSocketRoute(socketRoute);

    expect(() =>
      router.addSocketRoute(
        defineSocketRoute(ChatController, {
          name: "chat.socket.other",
          path: "/ws",
        }).route,
      ),
    ).toThrow(RouterException);
  });
});
