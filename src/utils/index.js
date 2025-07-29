import { FreestyleSandboxes } from "freestyle-sandboxes";
import "dotenv/config";

const api = new FreestyleSandboxes({
  apiKey: process.env.FREESTYLE_API_KEY
});