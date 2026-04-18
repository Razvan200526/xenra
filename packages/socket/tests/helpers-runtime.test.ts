import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { container } from "@xenra/container";
import { HttpException } from "@xenra/exceptions";
import { createContext } from "@xenra/http";
import { logger } from "@xenra/logger";
import { createSocketContext, createSocketHandshakeContext } from "../src/context";
import { isTextSocketMessage, parseSocketMessage, resolveSocketController } from "../src/controller";
import { createSocketErrorResponse, createSocketExceptionResponse, sendSocketError } from "../src/errors";
import {
  cleanupSocketSession,
  createSocketSession,
  deleteSocketSession,
  getSocketSession,
  getSocketSessionId,
} from "../src/session";
import type { SocketContext } from "../src/types";
import { createMockServer, createMockWebSocket } from "./helpers";

const originalLoggerException = logger.exception;

describe("@xenra/socket helpers", () => {
  beforeEach(() => {
    logger.exception = () => {};
  });

  afterEach(() => {
    logger.exception = originalLoggerException;
  });

  test("parseSocketMessage handles empty, valid json, and invalid payloads", () => {
    expect(parseSocketMessage("   ")).toBeUndefined();
    expect(parseSocketMessage('{"ok":true}')).toEqual({ ok: true });
    expect(() => parseSocketMessage("{oops")).toThrow(SyntaxError);
  });

  test("isTextSocketMessage distinguishes text and binary frames", () => {
    expect(isTextSocketMessage("hello")).toBe(true);
    expect(isTextSocketMessage(Buffer.from("hello"))).toBe(false);
  });

  test("resolveSocketController lazily registers controllers in the shared container", () => {
    class SocketController {
      readonly id = crypto.randomUUID();
    }

    container.remove(SocketController);

    const first = resolveSocketController(SocketController);
    const second = resolveSocketController(SocketController);

    expect(first).toBeInstanceOf(SocketController);
    expect(first).toBe(second);

    container.remove(SocketController);
  });

  test("createSocketHandshakeContext adapts an HTTP context for websocket use", () => {
    const baseRoute = {
      name: "chat.socket",
      path: "/ws",
      method: "SOCKET" as const,
      controller: class ChatController {},
      isSocket: true as const,
    };

    const context = createSocketHandshakeContext({
      req: new Request("http://localhost/ws"),
      route: baseRoute,
      params: { room: "general" },
      data: { userId: 1 },
    });

    expect(context.method).toBe("SOCKET");
    expect(context.params).toEqual({ room: "general" });
    expect(context.data).toEqual({ userId: 1 });
    expect(context.channel.isSubscribed()).toBe(false);
    expect(context.channel.send(new Response("x"))).rejects.toThrow(
      "Socket channel is not available before the connection is upgraded",
    );
  });

  test("createSocketContext binds send, close, subscribe, unsubscribe, and publish helpers", async () => {
    const route = {
      name: "chat.socket",
      path: "/ws",
      method: "SOCKET" as const,
      controller: class ChatController {},
      isSocket: true as const,
    };
    const session = createSocketSession({
      req: new Request("http://localhost/ws"),
      route,
      params: { room: "general" },
      validated: {
        body: undefined,
        query: undefined,
        params: undefined,
      },
      data: { source: "session" },
    });
    const server = createMockServer();
    const ws = createMockWebSocket({
      id: session.id,
      data: { source: "websocket" },
    });

    try {
      const context = createSocketContext({
        ws,
        server,
        message: "hello",
        session,
        body: { ok: true },
      });

      await context.channel.send(new Response("sent"));
      await context.channel.subscribe();
      await context.channel.publish(new Response("broadcast"));
      await context.channel.unsubscribe();
      context.channel.close(1000, "done");

      expect(context.data).toEqual({ source: "websocket" });
      expect(context.message).toBe("hello");
      expect(ws.sentMessages).toEqual(["sent"]);
      expect(server.publishedMessages).toEqual([{ channel: "chat.socket", message: "broadcast" }]);
      expect(ws.closeArgs).toEqual([1000, "done"]);
      expect(context.channel.isSubscribed()).toBe(false);
    } finally {
      deleteSocketSession(session.id);
    }
  });

  test("socket error helpers produce serialized JSON responses", async () => {
    const context = createContext(new Request("http://localhost/ws")) as SocketContext;
    context.method = "SOCKET";
    context.message = "";
    context.route = {
      name: "chat.socket",
      path: "/ws",
      method: "SOCKET",
      isSocket: true,
    };
    context.data = undefined;
    context.channel = {
      send: async () => undefined,
      close: () => undefined,
      subscribe: async () => undefined,
      isSubscribed: () => false,
      unsubscribe: async () => undefined,
      publish: async () => undefined,
    };

    expect(await createSocketErrorResponse(context, "bad request", 422, "BAD").json()).toEqual({
      ok: false,
      message: "bad request",
      key: "BAD",
    });
    expect(createSocketExceptionResponse(context, new HttpException("Forbidden", 403)).status).toBe(403);
    expect(createSocketExceptionResponse(context, new Error("boom")).status).toBe(500);

    const sentResponses: Response[] = [];
    context.channel.send = async (response) => {
      sentResponses.push(response);
    };

    await sendSocketError(context, "invalid");

    expect(sentResponses).toHaveLength(1);
    expect(await sentResponses[0]?.json()).toEqual({
      ok: false,
      message: "invalid",
    });
  });

  test("session helpers create, resolve, and clean up sessions", () => {
    const route = {
      name: "chat.socket",
      path: "/ws",
      method: "SOCKET" as const,
      controller: class ChatController {},
      isSocket: true as const,
    };
    const session = createSocketSession({
      req: new Request("http://localhost/ws"),
      route,
      params: {},
      validated: {
        body: undefined,
        query: undefined,
        params: undefined,
      },
      data: undefined,
    });
    const ws = createMockWebSocket({
      id: session.id,
      data: undefined,
    });

    expect(getSocketSessionId(ws.data)).toBe(session.id);
    expect(getSocketSession(ws)?.id).toBe(session.id);

    cleanupSocketSession(ws);

    expect(getSocketSession(ws)).toBeNull();
    expect(getSocketSessionId(undefined)).toBeNull();
  });
});
