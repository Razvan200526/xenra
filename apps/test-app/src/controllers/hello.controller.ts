import { Route } from "@xenra/decorators";
import type { Context } from "@xenra/http";
@Route.get({ name: "hello", path: "/asdasd" })
export class HelloController {
  handler(ctx: Context) {
    return ctx.json({
      ok: true,
      app: "test-app",
      message: "Core server is running",
    });
  }
}

@Route.get({ name: "get-user", path: "/users/:id" })
export class UserController {
  handler(ctx: Context) {
    return ctx.json({
      ok: true,
      params: ctx.params,
      userId: ctx.params.id ?? null,
    });
  }
}
