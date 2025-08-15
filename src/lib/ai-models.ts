import { openai } from "@ai-sdk/openai";

// Base OpenAI configuration
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
};

// Primary models
export const GPT_5 = openai("gpt-5", OPENAI_CONFIG);
export const GPT_5_MINI = openai("gpt-5-mini", OPENAI_CONFIG);

// Fallback model
export const GPT_4O = openai("gpt-4o", OPENAI_CONFIG);

// Default model (GPT-5 Mini for efficiency)
export const OPENAI_MODEL = GPT_5_MINI;

// Model selection based on task complexity
export const getModelForTask = (task: string) => {
  const taskLower = task.toLowerCase();
  
  // Use GPT-5 for complex tasks
  if (taskLower.includes('architecture') || 
      taskLower.includes('system-design') || 
      taskLower.includes('debugging') || 
      taskLower.includes('security') ||
      taskLower.includes('performance') ||
      taskLower.includes('complex')) {
    return GPT_5;
  }
  
  // Use GPT-5 Mini for most tasks (efficient and capable)
  return GPT_5_MINI;
};

// Quick access functions
export const getCodeGenerationModel = () => GPT_5_MINI;
export const getArchitectureModel = () => GPT_5;
export const getDebuggingModel = () => GPT_5;
export const getSecurityModel = () => GPT_5;
export const getPerformanceModel = () => GPT_5;
