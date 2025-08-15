import { Agent } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import { UIMessage } from "ai";
import { AIService } from "./ai-service";
import { redis } from "./redis";

// Stream state management
const streamStates = new Map<string, { state: "running" | "finished" | "error"; timestamp: number }>();

export async function isStreamRunning(appId: string): Promise<boolean> {
  const state = streamStates.get(appId);
  return state?.state === "running";
}

export async function stopStream(appId: string): Promise<void> {
  const state = streamStates.get(appId);
  if (state?.state === "running") {
    state.state = "error";
    state.timestamp = Date.now();
    streamStates.set(appId, state);
  }
}

export async function waitForStreamToStop(appId: string, timeout = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = streamStates.get(appId);
    if (state?.state !== "running") {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}

export async function clearStreamState(appId: string): Promise<void> {
  streamStates.delete(appId);
}

export async function updateKeepAlive(appId: string): Promise<void> {
  const state = streamStates.get(appId);
  if (state) {
    state.timestamp = Date.now();
    streamStates.set(appId, state);
  }
}

// Abort callback management
const abortCallbacks = new Map<string, () => void>();

export async function setupAbortCallback(appId: string, callback: () => void): Promise<void> {
  abortCallbacks.set(appId, callback);
}

export async function triggerAbort(appId: string): Promise<void> {
  const callback = abortCallbacks.get(appId);
  if (callback) {
    callback();
    abortCallbacks.delete(appId);
  }
}

export async function handleStreamLifecycle(
  appId: string,
  event: "start" | "finish" | "error"
): Promise<void> {
  switch (event) {
    case "start":
      streamStates.set(appId, { state: "running", timestamp: Date.now() });
      break;
    case "finish":
      streamStates.set(appId, { state: "finished", timestamp: Date.now() });
      break;
    case "error":
      streamStates.set(appId, { state: "error", timestamp: Date.now() });
      break;
  }
}

/**
 * Send a message to the AI and handle all stream plumbing internally
 * This is the main interface that developers should use
 */
export async function sendMessageWithStreaming(
  agent: Agent | null,
  appId: string,
  mcpUrl: string,
  fs: FreestyleDevServerFilesystem,
  message: UIMessage
) {
  const controller = new AbortController();
  let shouldAbort = false;

  // Set up abort callback
  await setupAbortCallback(appId, () => {
    shouldAbort = true;
  });

  let lastKeepAlive = Date.now();

  try {
    // Use the AI service to handle the AI interaction with timeout
    const aiResponse = await AIService.sendMessage(
      agent, // Can be null for auto-selection
      appId,
      mcpUrl,
      fs,
      message,
      {
        threadId: appId,
        resourceId: appId,
        maxSteps: 100,
        maxRetries: 0,
        maxOutputTokens: 64000,
        timeout: 30000, // 30 second timeout
        async onChunk() {
          if (Date.now() - lastKeepAlive > 5000) {
            lastKeepAlive = Date.now();
            await updateKeepAlive(appId);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async onStepFinish(_step: { response: { messages: unknown[] } }) {
          if (shouldAbort) {
            await handleStreamLifecycle(appId, "error");
            controller.abort("Aborted stream after step finish");
            const messages = await AIService.getUnsavedMessages(appId);
            console.log(messages);
            if (agent) {
              await AIService.saveMessagesToMemory(agent, appId, messages);
            }
          }
        },
        onError: async (error: { error: unknown }) => {
          console.error("Stream error in manager:", error);
          
          // Handle specific AI_APICallError for reasoning items
          if (error.error && typeof error.error === 'object' && 'name' in error.error) {
            const apiError = error.error as any;
            if (apiError.name === 'AI_APICallError' && apiError.message?.includes('reasoning')) {
              console.warn('Reasoning item error in stream manager, attempting recovery...');
              
              // Try to recover with a simpler approach
              try {
                const fallbackResponse = await AIService.sendMessage(
                  agent,
                  appId,
                  mcpUrl,
                  fs,
                  message,
                  {
                    threadId: appId,
                    resourceId: appId,
                    maxSteps: 50,
                    maxRetries: 0,
                    maxOutputTokens: 32000,
                    timeout: 15000, // Shorter timeout for fallback
                    async onChunk() {
                      if (Date.now() - lastKeepAlive > 5000) {
                        lastKeepAlive = Date.now();
                        await updateKeepAlive(appId);
                      }
                    },
                    async onStepFinish(step: { response: { messages: unknown[] } }) {
                      if (shouldAbort) {
                        await handleStreamLifecycle(appId, "error");
                        controller.abort("Aborted fallback stream after step finish");
                        const messages = await AIService.getUnsavedMessages(appId);
                        if (agent) {
                          await AIService.saveMessagesToMemory(agent, appId, messages);
                        }
                      }
                    },
                    onError: async (fallbackError: { error: unknown }) => {
                      console.error("Fallback stream error:", fallbackError);
                      await handleStreamLifecycle(appId, "error");
                    },
                    onFinish: async () => {
                      await handleStreamLifecycle(appId, "finish");
                    },
                    abortSignal: controller.signal,
                  }
                );
                
                return fallbackResponse;
              } catch (fallbackError) {
                console.error('Fallback stream also failed:', fallbackError);
              }
            }
          }
          
          await handleStreamLifecycle(appId, "error");
        },
        onFinish: async () => {
          await handleStreamLifecycle(appId, "finish");
        },
        abortSignal: controller.signal,
      }
    );

    // Ensure the stream has the proper method
    if (!aiResponse.stream.toUIMessageStreamResponse) {
      throw new Error("Invalid stream format - missing toUIMessageStreamResponse method");
    }

    return aiResponse;
  } catch (error) {
    console.error("Error in sendMessageWithStreaming:", error);
    await handleStreamLifecycle(appId, "error");
    throw error;
  }
}

/**
 * Get current stream state
 */
export async function getStreamState(appId: string): Promise<{ state: "running" | "finished" | "error" | "idle"; timestamp: number }> {
  const state = streamStates.get(appId);
  if (!state) {
    return { state: "idle", timestamp: Date.now() };
  }
  return state;
}

/**
 * Clean up old stream states
 */
export async function cleanupOldStreams(maxAge = 3600000): Promise<void> {
  const now = Date.now();
  for (const [appId, state] of streamStates.entries()) {
    if (now - state.timestamp > maxAge) {
      streamStates.delete(appId);
      abortCallbacks.delete(appId);
    }
  }
}

// Clean up old streams every hour
setInterval(cleanupOldStreams, 3600000);
