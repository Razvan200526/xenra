import { describe, expect, test } from "bun:test";

import type { IController, RegisteredRoute } from "../types";
import { matchRoute } from "./matchRoute";

const routes: RegisteredRoute[] = [
  {
    method: "GET",
    path: "/users/:id",
    controller: class UserController {} as IController,
    middlewares: [],
    meta: { name: "get-user" },
  },
  {
    method: "GET",
    path: "/",
    controller: class RootController {} as IController,
    middlewares: [],
    meta: { name: "root" },
  },
];

describe("matchRoute", () => {
  test("matches dynamic params for the same HTTP method", () => {
    const match = matchRoute(routes, "get", "/users/alex");

    expect(match).not.toBeNull();
    expect(match?.params).toEqual({ id: "alex" });
    expect(match?.route.meta.name).toBe("get-user");
  });

  test("normalizes the root path", () => {
    const match = matchRoute(routes, "GET", "/");

    expect(match).not.toBeNull();
    expect(match?.route.meta.name).toBe("root");
  });

  test("returns null when the method does not match", () => {
    expect(matchRoute(routes, "POST", "/users/alex")).toBeNull();
  });
});
