import type { IController } from "@xenra/http";

export type AppConfig = {
  name: string;
  cwd: string;
  controllers: IController[];
  middlewares: IController[]; //will create a custom middleware
};

export type ServerType = ReturnType<typeof Bun.serve>;
