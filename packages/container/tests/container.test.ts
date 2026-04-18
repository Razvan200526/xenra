import { afterEach, describe, expect, test } from "bun:test";
import { Container, ContainerException, container, injectable } from "../src";
import { EContainerScope } from "../src/types";

class PlainService {
  readonly id = crypto.randomUUID();
}

class DependencyService {
  readonly name = "dependency";
}

class NeedsDependency {
  constructor(public readonly dependency: DependencyService) {}
}

describe("@xenra/container", () => {
  afterEach(() => {
    container.remove(DependencyService);
    container.remove(NeedsDependency);
  });

  test("registers singleton services by default", () => {
    const local = new Container();

    local.add(PlainService);

    const first = local.get(PlainService);
    const second = local.get(PlainService);

    expect(first).toBeInstanceOf(PlainService);
    expect(first).toBe(second);
    expect(local.has(PlainService)).toBe(true);
  });

  test("supports transient services", () => {
    const local = new Container();

    local.add(PlainService, EContainerScope.Transient);

    const first = local.get(PlainService);
    const second = local.get(PlainService);

    expect(first).toBeInstanceOf(PlainService);
    expect(second).toBeInstanceOf(PlainService);
    expect(first).not.toBe(second);
  });

  test("supports request-scoped services without throwing", () => {
    const local = new Container();

    local.add(PlainService, EContainerScope.Request);

    expect(() => local.get(PlainService)).not.toThrow();
    expect(local.has(PlainService)).toBe(true);
  });

  test("re-registering a target replaces the previous binding", () => {
    const local = new Container();

    local.add(PlainService);
    const singleton = local.get(PlainService);

    local.add(PlainService, EContainerScope.Transient);
    const transientFirst = local.get(PlainService);
    const transientSecond = local.get(PlainService);

    expect(singleton).toBeInstanceOf(PlainService);
    expect(transientFirst).not.toBe(transientSecond);
  });

  test("throws ContainerException when getting an unbound target", () => {
    const local = new Container();

    expect(() => local.get(NeedsDependency)).toThrow(ContainerException);
    expect(() => local.get(NeedsDependency)).toThrow("Failed to resolve dependency for NeedsDependency.");
  });

  test("removes registered targets", () => {
    const local = new Container();

    local.add(PlainService);
    expect(local.has(PlainService)).toBe(true);

    local.remove(PlainService);

    expect(local.has(PlainService)).toBe(false);
  });

  test("stores, replaces, and removes constants", () => {
    const local = new Container();
    const token = Symbol("token");

    local.addConstant(token, { value: 1 });
    expect(local.hasConstant(token)).toBe(true);
    expect(local.getConstant<{ value: number }>(token)).toEqual({ value: 1 });

    local.addConstant(token, { value: 2 });
    expect(local.getConstant<{ value: number }>(token)).toEqual({ value: 2 });

    local.removeConstant(token);
    expect(local.hasConstant(token)).toBe(false);
  });

  test("throws ContainerException for missing constants", () => {
    const local = new Container();
    const token = Symbol("missing");

    expect(() => local.getConstant(token)).toThrow(ContainerException);
    expect(() => local.getConstant(token)).toThrow(`Failed to resolve constant for identifier ${String(token)}.`);
  });

  test("injectable decorator registers on the shared container", () => {
    @injectable(EContainerScope.Transient)
    class DecoratedTransientService {
      readonly id = crypto.randomUUID();
    }

    const first = container.get(DecoratedTransientService);
    const second = container.get(DecoratedTransientService);

    expect(first).toBeInstanceOf(DecoratedTransientService);
    expect(first).not.toBe(second);

    container.remove(DecoratedTransientService);
  });
});
