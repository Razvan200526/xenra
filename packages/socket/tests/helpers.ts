import type { Server, ServerWebSocket } from "bun";
import type { SocketConnectionData, SocketData } from "../src/types";

export type MockServer = Server<SocketConnectionData> & {
  upgradePayload?: SocketConnectionData;
  publishedMessages: Array<{
    channel: string;
    message: string;
  }>;
  shouldUpgrade: boolean;
};

export type MockWebSocket = ServerWebSocket<SocketConnectionData> & {
  sentMessages: string[];
  closeArgs: [number | undefined, string | undefined] | null;
  subscriptions: Set<string>;
};

export function createMockServer(overrides?: Partial<MockServer>): MockServer {
  const server = {
    publishedMessages: [] as Array<{ channel: string; message: string }>,
    shouldUpgrade: true,
    upgrade(_req: Request, options: { data: SocketConnectionData }) {
      server.upgradePayload = options.data;
      return server.shouldUpgrade;
    },
    publish(channel: string, message: string) {
      server.publishedMessages.push({ channel, message });
      return 1;
    },
    ...overrides,
  };

  return server as unknown as MockServer;
}

export function createMockWebSocket(data?: SocketConnectionData<SocketData>): MockWebSocket {
  const subscriptions = new Set<string>();
  const ws = {
    data,
    subscriptions,
    sentMessages: [] as string[],
    closeArgs: null as [number | undefined, string | undefined] | null,
    send(message: string) {
      ws.sentMessages.push(message);
      return 1;
    },
    close(code?: number, reason?: string) {
      ws.closeArgs = [code, reason];
    },
    subscribe(channel: string) {
      subscriptions.add(channel);
      return true;
    },
    unsubscribe(channel: string) {
      subscriptions.delete(channel);
      return true;
    },
    isSubscribed(channel: string) {
      return subscriptions.has(channel);
    },
  };

  return ws as unknown as MockWebSocket;
}
