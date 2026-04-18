import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { container } from "@xenra/container";
import { Route } from "@xenra/decorators";
import { HttpException } from "@xenra/exceptions";
import type { Context } from "@xenra/http";
import { router } from "@xenra/http";
import { logger } from "@xenra/logger";
import type { SocketContext } from "@xenra/socket";
import { App } from "../src/app";
import { createMockSocketServer, mockBunServe } from "./helpers";

const originalExceptionLogger = logger.exception;
const originalInfoLogger = logger.info;
const originalWarnLogger = logger.warn;
const originalSuccessLogger = logger.success;

describe("@xenra/core App", () => {
  beforeEach(() => {
    router.clear();
    logger.exception = () => {};
    logger.info = () => {};
    logger.warn = () => {};
    logger.success = () => {};
  });

  afterEach(() => {
    logger.exception = originalExceptionLogger;
    logger.info = originalInfoLogger;
    logger.warn = originalWarnLogger;
    logger.success = originalSuccessLogger;
  });

  test("run starts Bun.serve, normalizes localhost, and close stops the server", async () => {
    const mockServer = createMockSocketServer();
    const serve = mockBunServe(mockServer);

    try {
      const successMessages: string[] = [];
      logger.success = (message) => {
        successMessages.push(message);
      };

      const app = new App({
        name: "test-app",
        cwd: process.cwd(),
      });

      await app.run(4100);

      expect(serve.calls).toHaveLength(1);
      expect(serve.calls[0]?.port).toBe(4100);
      expect(serve.calls[0]?.hostname).toBe("0.0.0.0");
      expect(successMessages).toEqual(["Server listening on http://localhost:4100"]);

      app.close();

      expect(mockServer.stopCalls).toBe(1);
    } finally {
      serve.restore();
    }
  });

  test("warns when run is called twice and when close is called before start", async () => {
    const mockServer = createMockSocketServer();
    const serve = mockBunServe(mockServer);

    try {
      const warnings: string[] = [];
      logger.warn = (message) => {
        warnings.push(message);
      };

      const app = new App({
        name: "test-app",
        cwd: process.cwd(),
      });

      app.close();
      await app.run(4200);
      await app.run(4201);

      expect(warnings).toEqual(["Server is not running", "Server is already running"]);
    } finally {
      serve.restore();
    }
  });

  test("dispatches to a route, runs route middleware, and lazily registers the controller", async () => {
    class HelloController {
      handler(ctx: Context) {
        return ctx.json({
          ok: true,
          method: ctx.method,
          body: ctx.body,
        });
      }
    }

    const middlewareCalls: string[] = [];

    Route.post({
      name: "hello.create",
      path: "/",
      middlewares: [
        async (ctx, next) => {
          middlewareCalls.push(`before:${ctx.method}`);
          const response = await next();
          middlewareCalls.push(`after:${response.status}`);
          return response;
        },
      ],
    })(HelloController);
    container.remove(HelloController);

    const app = new App({
      name: "test-app",
      cwd: process.cwd(),
    });

    expect(container.has(HelloController)).toBe(false);

    const response = await app.handleRequest(
      new Request("http://localhost/", {
        method: "POST",
        body: JSON.stringify({ ok: true }),
        headers: {
          "content-type": "application/json",
          "content-length": "12",
        },
      }),
      createMockSocketServer(),
    );

    expect(container.has(HelloController)).toBe(true);
    expect(middlewareCalls).toEqual(["before:POST", "after:200"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      method: "POST",
      body: { ok: true },
    });
  });

  test("returns a 404 response when no route matches", async () => {
    const app = new App({
      name: "test-app",
      cwd: process.cwd(),
    });

    const response = await app.handleRequest(new Request("http://localhost/missing"), createMockSocketServer());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  test("serializes HttpException responses", async () => {
    class ProtectedController {
      handler(_ctx: Context) {
        throw new HttpException("Unauthorized", 401);
      }
    }

    Route.get({ name: "protected.index", path: "/protected" })(ProtectedController);

    const app = new App({
      name: "test-app",
      cwd: process.cwd(),
    });

    const response = await app.handleRequest(new Request("http://localhost/protected"), createMockSocketServer());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("returns a generic 500 response for unknown errors", async () => {
    class BrokenController {
      handler(_ctx: Context) {
        throw new Error("boom");
      }
    }

    Route.get({ name: "broken.index", path: "/broken" })(BrokenController);

    const app = new App({
      name: "test-app",
      cwd: process.cwd(),
    });

    const response = await app.handleRequest(new Request("http://localhost/broken"), createMockSocketServer());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
  });

  test("short-circuits HTTP handling when a websocket upgrade succeeds", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "chat.socket", path: "/ws" })(ChatController);

    const app = new App({
      name: "test-app",
      cwd: process.cwd(),
    });
    const server = createMockSocketServer();

    const response = await app.handleRequest(new Request("http://localhost/ws"), server);

    expect(response).toBeUndefined();
    expect(server.upgradeCalls).toHaveLength(1);
  });

  test("returns a 500 response when websocket upgrade fails", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "chat.failing", path: "/ws-fail" })(ChatController);

    const app = new App({
      name: "test-app",
      cwd: process.cwd(),
    });
    const server = createMockSocketServer({
      shouldUpgrade: false,
    });

    const response = await app.handleRequest(new Request("http://localhost/ws-fail"), server);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to upgrade websocket connection",
    });
  });
});
