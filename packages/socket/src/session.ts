import type { ServerWebSocket } from "bun";
import type { SocketConnectionData, SocketSession } from "./types";

const socketSessions = new Map<string, SocketSession>();

export function getSocketSessionId(data: SocketConnectionData | undefined): string | null {
  return typeof data?.id === "string" ? data.id : null;
}

export function createSocketSession(input: Omit<SocketSession, "id">): SocketSession {
  const session: SocketSession = {
    id: crypto.randomUUID(),
    ...input,
  };

  socketSessions.set(session.id, session);

  return session;
}

export function getSocketSession(ws: ServerWebSocket<SocketConnectionData>): SocketSession | null {
  const sessionId = getSocketSessionId(ws.data);

  if (!sessionId) {
    return null;
  }

  return socketSessions.get(sessionId) ?? null;
}

export function cleanupSocketSession(ws: ServerWebSocket<SocketConnectionData>): void {
  const sessionId = getSocketSessionId(ws.data);

  if (!sessionId) {
    return;
  }

  socketSessions.delete(sessionId);
}

export function deleteSocketSession(id: string): void {
  socketSessions.delete(id);
}
