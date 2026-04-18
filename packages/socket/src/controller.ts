import { container, EContainerScope } from "@xenra/container";
import type { SocketMessage } from "./types";

export function parseSocketMessage(message: string): unknown {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return undefined;
  }

  return JSON.parse(normalizedMessage);
}

export function resolveSocketController<T>(controller: new (...args: unknown[]) => T): T {
  if (!container.has(controller)) {
    container.add(controller, EContainerScope.Singleton);
  }

  return container.get<T>(controller);
}

export function isTextSocketMessage(message: SocketMessage): message is string {
  return typeof message === "string";
}
