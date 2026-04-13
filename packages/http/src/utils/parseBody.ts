import { hasBody } from "../body/hasBody";
import { normalizeContentType } from "../body/normalizeContentType";
import { bodyParsers } from "../body/parsers";
import type { Context } from "../types";

export async function parseBody(ctx: Context): Promise<unknown> {
  if (ctx.bodyParsed) {
    return ctx.body;
  }

  ctx.bodyParsed = true;

  const method = ctx.method.toUpperCase();
  if (method === "GET" || method === "HEAD") {
    ctx.body = undefined;
    return ctx.body;
  }

  if (!hasBody(ctx.req)) {
    ctx.body = undefined;
    return ctx.body;
  }

  const rawContentType = ctx.req.headers.get("content-type");
  const contentType = normalizeContentType(rawContentType);

  if (contentType.endsWith("+json")) {
    const text = await ctx.req.text();

    if (!text.trim()) {
      ctx.body = undefined;
      return ctx.body;
    }

    ctx.body = JSON.parse(text);
    return ctx.body;
  }

  const parser = bodyParsers[contentType];

  if (!parser) {
    const fallback = await ctx.req.text();
    ctx.body = fallback.length === 0 ? undefined : fallback;
    return ctx.body;
  }

  ctx.body = await parser(ctx.req);
  return ctx.body;
}
