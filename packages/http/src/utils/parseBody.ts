import type { Context } from "../types";

export async function parseBody(ctx: Context): Promise<unknown> {
  if (ctx.body) {
    return ctx.body;
  }
  const contentType = ctx.req.headers.get("content-type")?.split(";")[0]?.trim();

  switch (contentType) {
    case "application/json":
      return await ctx.req.json();
    case "text/plain":
      return await ctx.req.text();
    case "form-data":
      return await ctx.req.formData();
    default:
      return null;
  }
}
