import { Route } from "@xenra/decorators";
import type { Context } from "@xenra/http";
import { Validator } from "@xenra/decorators";
import { type } from "arktype";

const validator = new Validator(
  type({
    message: "string",
  }),
);

@Route.post({ name: "hello", path: "/asdasd", validators: { body: validator } })
export class HelloController {
  async handler(ctx: Context) {
    return ctx.json({
      ok: true,
      app: "test-app",
      message: "Core server is running",
    });
  }
}

@Route.get({ name: "get-user", path: "/users/:id" })
export class UserController {
  async handler(ctx: Context) {
    return ctx.html(`
      <html>
        <body>
          <h1>User ${ctx.params.id ?? null}</h1>
        </body>
      </html>
    `);
  }
}
