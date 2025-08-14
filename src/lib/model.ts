import { openai } from "@ai-sdk/openai";

export const OPENAI_MODEL = openai("gpt-4o", {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
});
