import { Route, Validator } from "@xenra/decorators";
import type { Context } from "@xenra/http";
import { type } from "arktype";
import { logger } from "../../../../packages/logger/src/logger";

const validators = {
  params: new Validator(
    type({
      id: "string",
      name: "string",
      task: type({
        title: "string",
      }),
    }),
  ),
};

@Route.delete({ name: "delete.user", path: "/users/delete/:id", validators })
export class DeleteUserController {
  async handler(ctx: Context) {
    const params = ctx.validated.params as { id: string; name: string; task: { title: string } };
    logger.info(`Deleting user with id: ${params.id}`);
    return ctx.json({
      ok: true,
      message: `User ${ctx.params.id} deleted successfully`,
    });
  }
}

@Route.get({ name: "hello", path: "/" })
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
