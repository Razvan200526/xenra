/** biome-ignore-all lint/suspicious/noExplicitAny: <trust me> */
import { logger } from "@xenra/logger";

// biome-ignore lint/suspicious/noShadowRestrictedNames: <trust me>
// biome-ignore lint/complexity/noBannedTypes: <trust me>
export function Logger<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      (this as any).logger = logger;
    }
  };
}
