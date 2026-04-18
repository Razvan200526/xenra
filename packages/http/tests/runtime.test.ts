import { describe, expect, test } from "bun:test";
import { hasBody } from "../src/body/hasBody";
import { MIME_TYPES } from "../src/body/mimeType";
import { normalizeContentType } from "../src/body/normalizeContentType";
import { bodyParsers } from "../src/body/parsers";
import { MiddlewareException } from "../src/exceptions/MiddlewareException";
import { createContext } from "../src/request/context";
import type { Context, IValidator } from "../src/types";
import { createValidationMiddleware } from "../src/utils/createValidationMiddleware";
import { parseBody } from "../src/utils/parseBody";
import { runMiddlewares } from "../src/utils/runMiddlewares";
import { createMockContext } from "./helpers";

class EchoValidator implements IValidator {
  validate(input: unknown) {
    return input;
  }
}

describe("@xenra/http runtime helpers", () => {
  test("createContext derives request metadata and response helpers", async () => {
    const ctx = createContext(new Request("http://localhost/users/1?tab=profile", { method: "POST" }));

    expect(ctx.method).toBe("POST");
    expect(ctx.path).toBe("/users/1");
    expect(ctx.query).toEqual({ tab: "profile" });
    expect(ctx.bodyParsed).toBe(false);
    expect(await ctx.json({ ok: true }).json()).toEqual({ ok: true });
    expect(ctx.json({ ok: true }).headers.get("content-type")).toBe("application/json");
    expect(ctx.html("<h1>ok</h1>").headers.get("content-type")).toBe("text/html");
  });

  test("hasBody handles transfer-encoding, content-length, and missing headers", () => {
    expect(
      hasBody(new Request("http://localhost", { method: "POST", headers: { "transfer-encoding": "chunked" } })),
    ).toBe(true);
    expect(hasBody(new Request("http://localhost", { method: "POST", headers: { "content-length": "10" } }))).toBe(
      true,
    );
    expect(hasBody(new Request("http://localhost", { method: "POST", headers: { "content-length": "0" } }))).toBe(
      false,
    );
    expect(hasBody(new Request("http://localhost", { method: "POST" }))).toBe(false);
  });

  test("normalizeContentType strips parameters and lowercases values", () => {
    expect(normalizeContentType("Application/JSON; charset=UTF-8")).toBe("application/json");
    expect(normalizeContentType(null)).toBe("");
  });

  test("body parsers cover json, form, plain text, html, and xml inputs", async () => {
    expect(
      await bodyParsers[MIME_TYPES.JSON](
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ ok: true }) }),
      ),
    ).toEqual({ ok: true });
    expect(
      await bodyParsers[MIME_TYPES.FORM_URLENCODED](
        new Request("http://localhost", { method: "POST", body: "name=alex&role=admin" }),
      ),
    ).toEqual({ name: "alex", role: "admin" });
    expect(
      await bodyParsers[MIME_TYPES.TEXT_PLAIN](new Request("http://localhost", { method: "POST", body: "hello" })),
    ).toBe("hello");
    expect(
      await bodyParsers[MIME_TYPES.TEXT_HTML](new Request("http://localhost", { method: "POST", body: "<p>hi</p>" })),
    ).toBe("<p>hi</p>");
    expect(
      await bodyParsers[MIME_TYPES.XML_APP](new Request("http://localhost", { method: "POST", body: "<tag />" })),
    ).toBe("<tag />");
  });

  test("parseBody handles GET and HEAD requests without consuming a body", async () => {
    const getContext = createContext(new Request("http://localhost", { method: "GET" }));
    const headContext = createContext(new Request("http://localhost", { method: "HEAD" }));

    expect(await parseBody(getContext)).toBeUndefined();
    expect(await parseBody(headContext)).toBeUndefined();
  });

  test("parseBody reads json, vendor json, fallback text, and empty payloads", async () => {
    const jsonContext = createContext(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ ok: true }),
        headers: {
          "content-type": "application/json",
          "content-length": "12",
        },
      }),
    );
    const vendorJsonContext = createContext(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ ok: true }),
        headers: {
          "content-type": "application/vnd.api+json",
          "content-length": "12",
        },
      }),
    );
    const textContext = createContext(
      new Request("http://localhost", {
        method: "POST",
        body: "raw-text",
        headers: {
          "content-type": "application/octet-stream",
          "content-length": "8",
        },
      }),
    );
    const emptyContext = createContext(
      new Request("http://localhost", {
        method: "POST",
        body: "",
        headers: {
          "content-type": "text/plain",
          "content-length": "0",
        },
      }),
    );

    expect(await parseBody(jsonContext)).toEqual({ ok: true });
    expect(await parseBody(vendorJsonContext)).toEqual({ ok: true });
    expect(await parseBody(textContext)).toBe("raw-text");
    expect(await parseBody(emptyContext)).toBeUndefined();
  });

  test("parseBody returns cached body after the first parse", async () => {
    const context = createMockContext({
      bodyParsed: true,
      body: {
        cached: true,
      },
    });

    expect(await parseBody(context)).toEqual({ cached: true });
  });

  test("parseBody throws for invalid json payloads", async () => {
    const context = createContext(
      new Request("http://localhost", {
        method: "POST",
        body: "{invalid}",
        headers: {
          "content-type": "application/json",
          "content-length": "9",
        },
      }),
    );

    await expect(parseBody(context)).rejects.toThrow(SyntaxError);
  });

  test("runMiddlewares executes in order and allows short-circuit responses", async () => {
    const calls: string[] = [];
    const ctx = createMockContext();

    const response = await runMiddlewares(
      ctx,
      [
        async (_innerCtx, next) => {
          calls.push("first:before");
          const result = await next();
          calls.push("first:after");
          return result;
        },
        async () => {
          calls.push("second:short-circuit");
          return new Response("blocked", { status: 403 });
        },
      ],
      async () => {
        calls.push("handler");
        return new Response("ok");
      },
    );

    expect(response.status).toBe(403);
    expect(calls).toEqual(["first:before", "second:short-circuit", "first:after"]);
  });

  test("runMiddlewares throws when next is called multiple times", async () => {
    const ctx = createMockContext();

    await expect(
      runMiddlewares(
        ctx,
        [
          async (_innerCtx, next) => {
            await next();
            return next();
          },
        ],
        async () => new Response("ok"),
      ),
    ).rejects.toThrow(MiddlewareException);
  });

  test("createValidationMiddleware validates query, body, and params", async () => {
    const middleware = createValidationMiddleware({
      query: new EchoValidator(),
      body: new EchoValidator(),
      params: new EchoValidator(),
    });
    const ctx = createMockContext({
      query: { page: "1" },
      body: { name: "alex" },
      params: { id: "10" },
      validated: {
        body: undefined,
        query: undefined,
        params: undefined,
      },
    });

    const response = await middleware(ctx as Context, async () => new Response("ok"));

    expect(response.status).toBe(200);
    expect(ctx.validated).toEqual({
      body: { name: "alex" },
      query: { page: "1" },
      params: { id: "10" },
    });
  });
});
