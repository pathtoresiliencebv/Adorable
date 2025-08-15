import { SYSTEM_MESSAGE } from "@/lib/system";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { todoTool } from "@/tools/todo-tool";
import { OPENAI_MODEL, getModelForTask } from "@/lib/ai-models";

export const memory = new Memory({
  options: {
    lastMessages: 1000,
    semanticRecall: false,
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

// Create agents with different models
export const builderAgent = new Agent({
  name: "BuilderAgent",
  model: OPENAI_MODEL, // Default to GPT-5 Mini
  instructions: SYSTEM_MESSAGE,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Create a function to get the best agent for a task
export const getAgentForTask = (task: string) => {
  const model = getModelForTask(task);
  
  return new Agent({
    name: `BuilderAgent-${model.modelId}`,
    model,
    instructions: SYSTEM_MESSAGE,
    memory,
    tools: {
      update_todo_list: todoTool,
    },
  });
};
