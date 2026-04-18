import { type Container, container as sharedContainer } from "./Container";
import { type Constructor, EContainerScope } from "./types";

export { Container } from "./Container";
export { ContainerException } from "./ContainerException";
export * from "./types";

export const container: Container = sharedContainer;

export const injectable = (scope: EContainerScope = EContainerScope.Singleton) => {
  return (target: Constructor): void => {
    container.add(target, scope);
  };
};
