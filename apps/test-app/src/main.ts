import { App } from "@xenra/core";
import { HelloController, UserController } from "./controllers/hello.controller";

const app = new App({
  name: "test-app",
  cwd: process.cwd(),
  controllers: [HelloController, UserController],
  middlewares: [],
});

await app.run();
