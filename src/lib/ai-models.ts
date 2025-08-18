import { anthropic } from "@ai-sdk/anthropic";

// Original Adorable uses Anthropic Claude models - reverted to Claude 3.5 Sonnet for stability
export const ANTHROPIC_MODEL = anthropic("claude-3-5-sonnet-20241022", {
  apiKey: process.env.ANTHROPIC_API_KEY,
});
