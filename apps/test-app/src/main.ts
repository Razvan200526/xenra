import { App } from "@xenra/core";
import { HelloController, UserController } from "./controllers/hello.controller";

new App({
  name: "test-app",
  cwd: process.cwd(),
  controllers: [HelloController, UserController],
  middlewares: [],
});
