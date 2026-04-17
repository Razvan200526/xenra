export type AppConfig = {
  name: string;
  cwd: string;
};

export type ServerType = ReturnType<typeof Bun.serve>;
