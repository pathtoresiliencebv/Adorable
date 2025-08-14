import { SYSTEM_MESSAGE } from "@/lib/system";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { todoTool } from "@/tools/todo-tool";

// Enhanced memory configuration for ChatGPT
export const memory = new Memory({
  options: {
    lastMessages: 1000,
    semanticRecall: false, // Disabled until embedder is configured
    threads: {
      generateTitle: true,
    },
  },
  vector: new PgVector({
    connectionString: process.env.DATABASE_URL!,
  }),
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
  }),
  processors: [],
});

// ChatGPT-optimized builder agent
export const builderAgent = new Agent({
  name: "BuilderAgent",
  model: openai("gpt-4o"),
  instructions: SYSTEM_MESSAGE,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Enhanced agent with error handling
export const createBuilderAgent = () => {
  try {
    return new Agent({
      name: "BuilderAgent",
      model: openai("gpt-4o"),
      instructions: SYSTEM_MESSAGE,
      memory,
      tools: {
        update_todo_list: todoTool,
      },
    });
  } catch (error) {
    console.error("Error creating builder agent:", error);
    throw new Error("Failed to create builder agent. Check your OpenAI API key and configuration.");
  }
};

// Export a function to get the agent with proper error handling
export const getBuilderAgent = () => {
  try {
    return builderAgent;
  } catch (error) {
    console.error("Error getting builder agent:", error);
    return createBuilderAgent();
  }
};
