import { Route } from "@xenra/decorators";
import type { Context } from "@xenra/http";
import type { SocketContext } from "@xenra/socket";

@Route.delete({ name: "delete.user", path: "/users/delete/:id" })
export class DeleteUserController {
  async handler(ctx: Context) {
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

/**
 * Real-time chat example.
 *
 * Connect:
 * ws://localhost:3000/ws
 *
 * Frames:
 * {"action":"join","username":"alex"}
 * {"action":"message","username":"alex","text":"hello team"}
 * {"action":"ping","username":"alex"}
 * {"action":"leave","username":"alex"}
 */
@Route.socket({
  name: "chat.socket",
  path: "/ws",
  description: "Simple real-time chat demo using websocket pub/sub",
})
export class ChatSocketController {
  private getPayload(ctx: SocketContext): {
    action?: string;
    username?: string;
    text?: string;
  } {
    if (!ctx.body || typeof ctx.body !== "object") {
      return {};
    }

    return ctx.body as {
      action?: string;
      username?: string;
      text?: string;
    };
  }

  async handler(ctx: SocketContext) {
    const { action, username, text } = this.getPayload(ctx);
    const author = username?.trim() || "anonymous";

    if (!action) {
      return ctx.json(
        {
          ok: false,
          message: "Missing action. Use join, message, ping, or leave.",
        },
        { status: 400 },
      );
    }

    switch (action) {
      case "join": {
        if (!ctx.channel.isSubscribed()) {
          await ctx.channel.subscribe();
        }

        await ctx.channel.publish(
          ctx.json({
            ok: true,
            type: "system",
            message: `${author} joined the chat`,
          }),
        );

        return ctx.json({
          ok: true,
          type: "joined",
          channel: ctx.route.name,
          username: author,
          message: `Connected to ${ctx.route.name}`,
        });
      }

      case "message": {
        if (!ctx.channel.isSubscribed()) {
          await ctx.channel.subscribe();
        }

        const content = text?.trim();
        if (!content) {
          return ctx.json(
            {
              ok: false,
              message: "Message text is required.",
            },
            { status: 400 },
          );
        }

        await ctx.channel.publish(
          ctx.json({
            ok: true,
            type: "message",
            username: author,
            text: content,
          }),
        );

        return;
      }

      case "ping": {
        return ctx.json({
          ok: true,
          type: "pong",
          username: author,
          timestamp: new Date().toISOString(),
        });
      }

      case "leave": {
        if (ctx.channel.isSubscribed()) {
          await ctx.channel.unsubscribe();
        }

        return ctx.json({
          ok: true,
          type: "left",
          username: author,
          message: `${author} left the chat`,
        });
      }

      default: {
        return ctx.json(
          {
            ok: false,
            message: `Unknown action '${action}'. Use join, message, ping, or leave.`,
          },
          { status: 400 },
        );
      }
    }
  }
}
