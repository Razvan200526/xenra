import "./controllers/hello.controller";
import { App } from "@xenra/core";

const app = new App({
  name: "test-app",
  cwd: process.cwd(),
});

async function bootstrap() {
  await app.run();
}

void bootstrap();
