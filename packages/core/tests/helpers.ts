import type { SocketConnectionData, SocketMessage } from "@xenra/socket";
import type { Server } from "bun";

export type MockSocketServer = Server<SocketConnectionData> & {
  hostname: string;
  protocol: string;
  stopCalls: number;
  upgradeCalls: Array<{
    req: Request;
    data: SocketConnectionData;
  }>;
  shouldUpgrade?: boolean;
  publishedMessages: Array<{
    channel: string;
    message: string;
  }>;
};

export function createMockSocketServer(overrides?: Partial<MockSocketServer>): MockSocketServer {
  const server = {
    hostname: "0.0.0.0",
    protocol: "http",
    stopCalls: 0,
    shouldUpgrade: true,
    upgradeCalls: [] as Array<{ req: Request; data: SocketConnectionData }>,
    publishedMessages: [] as Array<{ channel: string; message: string }>,
    stop() {
      server.stopCalls += 1;
    },
    upgrade(req: Request, options: { data: SocketConnectionData }) {
      server.upgradeCalls.push({ req, data: options.data });
      return server.shouldUpgrade ?? true;
    },
    publish(channel: string, message: string) {
      server.publishedMessages.push({ channel, message });
      return 1;
    },
    ...overrides,
  };

  return server as unknown as MockSocketServer;
}

export type MockServeState = {
  calls: Array<{
    port: number;
    hostname: string;
    fetch: (req: Request, server: Server<SocketConnectionData>) => Promise<Response | undefined>;
    websocket: {
      perMessageDeflate: boolean;
      message: (ws: unknown, message: SocketMessage) => Promise<void>;
      close: (ws: unknown) => void;
    };
  }>;
  restore: () => void;
};

export function mockBunServe(server: MockSocketServer): MockServeState {
  const original = Bun.serve;
  const calls: MockServeState["calls"] = [];

  Bun.serve = ((options: {
    port: number;
    hostname: string;
    fetch: (req: Request, server: Server<SocketConnectionData>) => Promise<Response | undefined>;
    websocket: {
      perMessageDeflate: boolean;
      message: (ws: unknown, message: SocketMessage) => Promise<void>;
      close: (ws: unknown) => void;
    };
  }) => {
    calls.push(options);
    return server;
  }) as typeof Bun.serve;

  return {
    calls,
    restore: () => {
      Bun.serve = original;
    },
  };
}
