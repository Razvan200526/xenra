/** biome-ignore-all lint/suspicious/noExplicitAny: <trust me> */
import { logger as sharedLogger } from "@xenra/logger";

type Constructor<TInstance = object> = new (...args: any[]) => TInstance;
type LoggerAware = {
  logger: typeof sharedLogger;
};

// biome-ignore lint/suspicious/noShadowRestrictedNames: <trust me>
export function Logger<T extends Constructor>(constructor: T): T {
  const LoggedClass: T = class extends constructor {
    readonly logger: typeof sharedLogger = sharedLogger;

    // biome-ignore lint/complexity/noUselessConstructor: <trust me>
    constructor(...args: any[]) {
      super(...args);
    }
  } as T & Constructor<InstanceType<T> & LoggerAware>;

  return LoggedClass;
}
