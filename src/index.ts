import { Elysia } from "elysia";
import Routes from "./routes";
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import scheduler from "./scheduler";

const app = new Elysia()
  .use(swagger())
  .use(cors())
  .use(scheduler)
  .use(Routes);

app.listen(process.env.PORT ?? 3000);
console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
