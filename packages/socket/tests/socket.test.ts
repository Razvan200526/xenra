import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { container } from "@xenra/container";
import { HttpException } from "@xenra/exceptions";
import { router } from "@xenra/http";
import { logger } from "@xenra/logger";
import { Route } from "../../decorators/src/Route";
import { cleanupSocketSession } from "../src/session";
import { socketHandler, tryUpgradeSocket } from "../src/socket";
import type { SocketContext } from "../src/types";
import { createMockServer, createMockWebSocket } from "./helpers";

const originalExceptionLogger = logger.exception;

describe("@xenra/socket runtime", () => {
  beforeEach(() => {
    router.clear();
    logger.exception = () => {};
  });

  afterEach(() => {
    logger.exception = originalExceptionLogger;
  });

  test("returns false when no websocket route matches", async () => {
    const result = await tryUpgradeSocket({
      req: new Request("http://localhost/no-ws"),
      server: createMockServer(),
    });

    expect(result).toBe(false);
  });

  test("upgrades and handles a socket route declared with Route.socket", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({
          ok: true,
          route: ctx.route.name,
          message: ctx.message,
        });
      }
    }

    Route.socket({ name: "chat.socket", path: "/ws" })(ChatController);

    const server = createMockServer();
    const upgradeResult = await tryUpgradeSocket({
      req: new Request("http://localhost/ws"),
      server,
    });

    expect(upgradeResult).toBeUndefined();
    expect(server.upgradePayload?.id).toBeString();

    const ws = createMockWebSocket(server.upgradePayload);

    await socketHandler({
      ws,
      server,
      message: JSON.stringify({ action: "ping" }),
    });

    expect(ws.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws.sentMessages[0] ?? "")).toEqual({
      ok: true,
      route: "chat.socket",
      message: '{"action":"ping"}',
    });

    cleanupSocketSession(ws);
    container.remove(ChatController);
  });

  test("returns an HTTP response when handshake middleware short-circuits", async () => {
    class GuardedChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({
      name: "guarded.socket",
      path: "/guarded",
      middlewares: [
        async (ctx) => {
          return ctx.json({ ok: false, message: "blocked" }, { status: 401 });
        },
      ],
    })(GuardedChatController);

    const response = await tryUpgradeSocket({
      req: new Request("http://localhost/guarded"),
      server: createMockServer(),
    });

    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({ ok: false, message: "blocked" });
    container.remove(GuardedChatController);
  });

  test("returns an error response when handshake middleware throws HttpException", async () => {
    class GuardedChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({
      name: "guarded.http-exception",
      path: "/guarded-http",
      middlewares: [
        async () => {
          throw new HttpException("Forbidden", 403);
        },
      ],
    })(GuardedChatController);

    const response = await tryUpgradeSocket({
      req: new Request("http://localhost/guarded-http"),
      server: createMockServer(),
    });

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "Forbidden" });
    container.remove(GuardedChatController);
  });

  test("returns a 500 response when handshake middleware throws an unknown error", async () => {
    class BrokenChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({
      name: "guarded.unknown-error",
      path: "/guarded-unknown",
      middlewares: [
        async () => {
          throw new Error("boom");
        },
      ],
    })(BrokenChatController);

    const response = await tryUpgradeSocket({
      req: new Request("http://localhost/guarded-unknown"),
      server: createMockServer(),
    });

    expect(response?.status).toBe(500);
    expect(await response?.json()).toEqual({ error: "Internal Server Error" });
    container.remove(BrokenChatController);
  });

  test("returns a 500 response when the server cannot upgrade the connection", async () => {
    class FailingChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "failing.socket", path: "/failing" })(FailingChatController);

    const response = await tryUpgradeSocket({
      req: new Request("http://localhost/failing"),
      server: createMockServer({
        shouldUpgrade: false,
      }),
    });

    expect(response?.status).toBe(500);
    expect(await response?.json()).toEqual({
      error: "Failed to upgrade websocket connection",
    });
    container.remove(FailingChatController);
  });

  test("rejects binary websocket frames", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "chat.binary", path: "/binary" })(ChatController);

    const server = createMockServer();
    await tryUpgradeSocket({
      req: new Request("http://localhost/binary"),
      server,
    });

    const ws = createMockWebSocket(server.upgradePayload);

    await socketHandler({
      ws,
      server,
      message: Buffer.from("hello"),
    });

    expect(JSON.parse(ws.sentMessages[0] ?? "")).toEqual({
      ok: false,
      message: "Binary websocket frames are not supported",
      key: "UNSUPPORTED_FRAME_TYPE",
    });

    cleanupSocketSession(ws);
    container.remove(ChatController);
  });

  test("sends an error for invalid JSON payloads", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "chat.invalid-json", path: "/invalid-json" })(ChatController);

    const server = createMockServer();
    await tryUpgradeSocket({
      req: new Request("http://localhost/invalid-json"),
      server,
    });

    const ws = createMockWebSocket(server.upgradePayload);

    await socketHandler({
      ws,
      server,
      message: "{not-json}",
    });

    expect(JSON.parse(ws.sentMessages[0] ?? "")).toEqual({
      ok: false,
      message: "Invalid JSON format",
    });

    cleanupSocketSession(ws);
    container.remove(ChatController);
  });

  test("sends controller responses and supports additional request middlewares", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({
          ok: true,
          route: ctx.route.name,
          body: ctx.body,
        });
      }
    }

    Route.socket({ name: "chat.middleware", path: "/middleware" })(ChatController);

    const server = createMockServer();
    await tryUpgradeSocket({
      req: new Request("http://localhost/middleware"),
      server,
    });

    const ws = createMockWebSocket(server.upgradePayload);
    const calls: string[] = [];

    await socketHandler({
      ws,
      server,
      message: JSON.stringify({ action: "ping" }),
      middlewares: [
        async (ctx, next) => {
          calls.push(`before:${ctx.message}`);
          const response = await next();
          calls.push(response instanceof Response ? `after:${response.status}` : "after:void");
          return response;
        },
      ],
    });

    expect(calls).toEqual(['before:{"action":"ping"}', "after:200"]);
    expect(JSON.parse(ws.sentMessages[0] ?? "")).toEqual({
      ok: true,
      route: "chat.middleware",
      body: { action: "ping" },
    });

    cleanupSocketSession(ws);
    container.remove(ChatController);
  });

  test("serializes HttpException thrown from controllers", async () => {
    class ChatController {
      handler(_ctx: SocketContext) {
        throw new HttpException("Socket forbidden", 403);
      }
    }

    Route.socket({ name: "chat.http-exception", path: "/socket-http-exception" })(ChatController);

    const server = createMockServer();
    await tryUpgradeSocket({
      req: new Request("http://localhost/socket-http-exception"),
      server,
    });

    const ws = createMockWebSocket(server.upgradePayload);

    await socketHandler({
      ws,
      server,
      message: JSON.stringify({ action: "ping" }),
    });

    expect(JSON.parse(ws.sentMessages[0] ?? "")).toEqual({
      ok: false,
      message: "Socket forbidden",
    });

    cleanupSocketSession(ws);
    container.remove(ChatController);
  });

  test("serializes unknown controller errors as internal server errors", async () => {
    class ChatController {
      handler(_ctx: SocketContext) {
        throw new Error("boom");
      }
    }

    Route.socket({ name: "chat.unknown-error", path: "/socket-unknown-error" })(ChatController);

    const server = createMockServer();
    await tryUpgradeSocket({
      req: new Request("http://localhost/socket-unknown-error"),
      server,
    });

    const ws = createMockWebSocket(server.upgradePayload);

    await socketHandler({
      ws,
      server,
      message: JSON.stringify({ action: "ping" }),
    });

    expect(JSON.parse(ws.sentMessages[0] ?? "")).toEqual({
      ok: false,
      message: "Internal Server Error",
    });

    cleanupSocketSession(ws);
    container.remove(ChatController);
  });

  test("closes the websocket when the session has been cleaned up", async () => {
    class ChatController {
      handler(ctx: SocketContext) {
        return ctx.json({ ok: true, route: ctx.route.name });
      }
    }

    Route.socket({ name: "chat.cleanup", path: "/cleanup" })(ChatController);

    const server = createMockServer();
    await tryUpgradeSocket({
      req: new Request("http://localhost/cleanup"),
      server,
    });

    const ws = createMockWebSocket(server.upgradePayload);

    cleanupSocketSession(ws);

    await socketHandler({
      ws,
      server,
      message: JSON.stringify({ action: "ping" }),
    });

    expect(ws.closeArgs).toEqual([1011, "Socket session not found"]);
    container.remove(ChatController);
  });
});
