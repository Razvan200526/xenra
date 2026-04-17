/** biome-ignore-all lint/suspicious/noExplicitAny: trust me */

import { Container as InversifyContainer, injectable } from "inversify";
import { ContainerException } from "./ContainerException";
import { EContainerScope, type IContainer } from "./types";

const di = new InversifyContainer();

export class Container implements IContainer {
  public add(target: new (...args: any[]) => any, scope = EContainerScope.Singleton): void {
    try {
      di.unbind(target);
    } catch {}

    try {
      injectable()(target);
    } catch {}

    const binding = di.bind(target).toSelf();

    switch (scope) {
      case EContainerScope.Request:
        binding.inRequestScope();
        break;
      case EContainerScope.Transient:
        binding.inTransientScope();
        break;
      default:
        binding.inSingletonScope();
    }
  }

  public get<T>(target: new (...args: any[]) => T): T {
    try {
      return di.get<T>(target);
    } catch (error) {
      throw new ContainerException(
        `Failed to resolve dependency for ${target.name}.`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  public removeConstant(identifier: string | symbol): void {
    if (di.isBound(identifier)) {
      di.unbind(identifier);
    }
  }
  public has(target: new (...args: any[]) => unknown): boolean {
    return di.isBound(target);
  }
  public getConstant<T>(identifier: string | symbol): T {
    try {
      return di.get<T>(identifier);
    } catch (error) {
      throw new ContainerException(
        `Failed to resolve constant for identifier ${String(identifier)}.`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  public addConstant<T>(identifier: string | symbol, value: T): void {
    try {
      di.unbind(identifier);
    } catch {}

    di.bind<T>(identifier).toConstantValue(value);
  }
  public hasConstant(identifier: string | symbol): boolean {
    return di.isBound(identifier);
  }

  public remove(target: new (...args: any[]) => unknown): void {
    if (di.isBound(target)) {
      di.unbind(target);
    }
  }
}

export const container = new Container();
