import { Elysia } from "elysia";
import users from "./users";

const app = new Elysia().use(users);

export default app;
