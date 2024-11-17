import { Elysia } from "elysia";
import claim from "../schema/validations/Claim";
import ClaimService from "../services/users/claim";

const app = new Elysia({ prefix: "/users" });

app.get(
  "/claim/:wallet",
  async (req) => {
    return await ClaimService(req.params.wallet);
  },
  { params: claim }
);

export default app;
