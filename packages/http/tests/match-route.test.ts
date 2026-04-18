import { describe, expect, test } from "bun:test";
import type { IController, RegisteredRoute } from "../src/types";
import { matchRoute, matchSocketRoute } from "../src/utils/matchRoute";

const routes: RegisteredRoute[] = [
  {
    name: "get-user",
    method: "GET",
    path: "/users/:id",
    controller: class UserController {} as IController,
    middlewares: [],
  },
  {
    name: "root",
    method: "GET",
    path: "/",
    controller: class RootController {} as IController,
    middlewares: [],
  },
  {
    name: "chat.socket",
    method: "SOCKET",
    path: "/ws/:room",
    controller: class ChatController {} as IController,
    middlewares: [],
    isSocket: true,
  },
];

describe("@xenra/http matchRoute", () => {
  test("matches dynamic params for the same HTTP method", () => {
    const match = matchRoute(routes, "get", "/users/alex");

    expect(match).not.toBeNull();
    expect(match?.params).toEqual({ id: "alex" });
    expect(match?.route.name).toBe("get-user");
  });

  test("normalizes trailing slashes and root paths", () => {
    expect(matchRoute(routes, "GET", "/")?.route.name).toBe("root");
    expect(matchRoute(routes, "GET", "/users/alex/")?.route.name).toBe("get-user");
  });

  test("decodes dynamic params", () => {
    const match = matchRoute(routes, "GET", "/users/alex%20smith");

    expect(match?.params).toEqual({ id: "alex smith" });
  });

  test("returns null when the method does not match or the path length differs", () => {
    expect(matchRoute(routes, "POST", "/users/alex")).toBeNull();
    expect(matchRoute(routes, "GET", "/users/alex/details")).toBeNull();
  });

  test("ignores socket routes when matching HTTP routes", () => {
    expect(matchRoute(routes, "GET", "/ws/room-1")).toBeNull();
  });

  test("matches socket routes and ignores HTTP routes", () => {
    expect(matchSocketRoute("/ws/general", routes)?.params).toEqual({ room: "general" });
    expect(matchSocketRoute("/users/alex", routes)).toBeNull();
  });
});
