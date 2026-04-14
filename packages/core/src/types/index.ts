import type { IController, Middleware } from "@xenra/http";

export type AppConfig = {
  name: string;
  cwd: string;
  controllers: IController[];
  middlewares: Middleware[]; //will create a custom middleware
};

export type ServerType = ReturnType<typeof Bun.serve>;
