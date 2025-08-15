import { UIMessage } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { redis, redisPublisher } from "./redis";
import { AIService } from "./ai-service";
import { Agent } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export interface StreamState {
  state: string | null;
}

export interface StreamResponse {
  response(): Response;
}

export interface StreamInfo {
  readableStream(): Promise<ReadableStream<string>>;
  response(): Promise<Response>;
}

/**
 * Get the current stream state for an app
 */
export async function getStreamState(appId: string): Promise<StreamState> {
  console.log("🔍 [STREAM MANAGER] Getting stream state for appId:", appId);
  const state = await redisPublisher.get(`app:${appId}:stream-state`);
  console.log("📊 [STREAM MANAGER] Stream state:", state);
  return { state };
}

/**
 * Check if a stream is currently running for an app
 */
export async function isStreamRunning(appId: string): Promise<boolean> {
  console.log("🔍 [STREAM MANAGER] Checking if stream is running for appId:", appId);
  const state = await redisPublisher.get(`app:${appId}:stream-state`);
  const isRunning = state === "running";
  console.log("🔄 [STREAM MANAGER] Stream running:", isRunning);
  return isRunning;
}

/**
 * Stop a running stream for an app
 */
export async function stopStream(appId: string): Promise<void> {
  console.log("🛑 [STREAM MANAGER] Stopping stream for appId:", appId);
  await redisPublisher.publish(
    `events:${appId}`,
    JSON.stringify({ type: "abort-stream" })
  );
  await redisPublisher.del(`app:${appId}:stream-state`);
  console.log("✅ [STREAM MANAGER] Stream stop command sent");
}

/**
 * Wait for a stream to stop (with timeout)
 */
export async function waitForStreamToStop(
  appId: string,
  maxAttempts: number = 60
): Promise<boolean> {
  console.log("⏳ [STREAM MANAGER] Waiting for stream to stop, max attempts:", maxAttempts);
  for (let i = 0; i < maxAttempts; i++) {
    const state = await redisPublisher.get(`app:${appId}:stream-state`);
    if (!state) {
      console.log("✅ [STREAM MANAGER] Stream stopped successfully");
      return true;
    }
    console.log(`⏳ [STREAM MANAGER] Attempt ${i + 1}/${maxAttempts}, state:`, state);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("❌ [STREAM MANAGER] Stream did not stop within timeout");
  return false;
}

/**
 * Clear the stream state for an app
 */
export async function clearStreamState(appId: string): Promise<void> {
  console.log("🧹 [STREAM MANAGER] Clearing stream state for appId:", appId);
  await redisPublisher.del(`app:${appId}:stream-state`);
  console.log("✅ [STREAM MANAGER] Stream state cleared");
}

/**
 * Get an existing stream for an app
 */
export async function getStream(appId: string): Promise<StreamInfo | null> {
  console.log("🔍 [STREAM MANAGER] Getting existing stream for appId:", appId);
  const hasStream = await streamContext.hasExistingStream(appId);
  console.log("📊 [STREAM MANAGER] Has existing stream:", hasStream);
  if (hasStream === true) {
    return {
      async readableStream() {
        console.log("📖 [STREAM MANAGER] Resuming existing readable stream");
        const stream = await streamContext.resumeExistingStream(appId);
        if (!stream) {
          console.error("❌ [STREAM MANAGER] Failed to resume existing stream");
          throw new Error("Failed to resume existing stream");
        }
        console.log("✅ [STREAM MANAGER] Existing readable stream resumed");
        return stream;
      },
      async response() {
        console.log("📤 [STREAM MANAGER] Resuming existing response stream");
        const resumableStream = await streamContext.resumeExistingStream(appId);
        if (!resumableStream) {
          console.error("❌ [STREAM MANAGER] Failed to resume existing response stream");
          throw new Error("Failed to resume existing response stream");
        }
        console.log("✅ [STREAM MANAGER] Existing response stream resumed");
        return new Response(resumableStream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-accel-buffering": "no",
          },
        });
      },
    };
  }
  console.log("❌ [STREAM MANAGER] No existing stream found");
  return null;
}

/**
 * Set up a new stream for an app
 */
export async function setStream(
  appId: string,
  prompt: UIMessage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: any
): Promise<StreamResponse> {
  console.log("🆕 [STREAM MANAGER] Setting up new stream for appId:", appId);
  
  if (!stream.toUIMessageStreamResponse) {
    console.error("❌ [STREAM MANAGER] Stream missing toUIMessageStreamResponse method!");
    throw new Error("Stream missing required toUIMessageStreamResponse method");
  }

  const responseBody = stream.toUIMessageStreamResponse().body;
  console.log("📦 [STREAM MANAGER] Response body exists:", !!responseBody);

  if (!responseBody) {
    console.error("❌ [STREAM MANAGER] Response body is undefined!");
    throw new Error(
      "Error creating resumable stream: response body is undefined"
    );
  }

  console.log("💾 [STREAM MANAGER] Setting stream state to running");
  await redisPublisher.set(`app:${appId}:stream-state`, "running", {
    EX: 15,
  });

  console.log("🔄 [STREAM MANAGER] Creating resumable stream");
  const resumableStream = await streamContext.createNewResumableStream(
    appId,
    () => {
      console.log("📤 [STREAM MANAGER] Creating readable stream from response body");
      return responseBody.pipeThrough(
        new TextDecoderStream()
      ) as ReadableStream<string>;
    }
  );

  if (!resumableStream) {
    console.error("❌ [STREAM MANAGER] Failed to create resumable stream");
    throw new Error("Failed to create resumable stream");
  }

  console.log("✅ [STREAM MANAGER] Resumable stream created successfully");

  return {
    response() {
      console.log("🎯 [STREAM MANAGER] Setting up response with abort callback");
      // Set up abort callback directly since this is a synchronous context
      redis.subscribe(`events:${appId}`, (event) => {
        const data = JSON.parse(event);
        if (data.type === "abort-stream") {
          console.log("🛑 [STREAM MANAGER] Cancelling http stream");
          resumableStream?.cancel();
        }
      });

      console.log("📤 [STREAM MANAGER] Returning response with headers");
      return new Response(resumableStream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-vercel-ai-ui-message-stream": "v1",
          "x-accel-buffering": "no",
        },
        status: 200,
      });
    },
  };
}

/**
 * Set up an abort callback for a stream
 */
export async function setupAbortCallback(
  appId: string,
  callback: () => void
): Promise<void> {
  console.log("🎯 [STREAM MANAGER] Setting up abort callback for appId:", appId);
  redis.subscribe(`events:${appId}`, (event) => {
    const data = JSON.parse(event);
    if (data.type === "abort-stream") {
      console.log("🛑 [STREAM MANAGER] Abort callback triggered");
      callback();
    }
  });
}

/**
 * Update the keep-alive timestamp for a stream
 */
export async function updateKeepAlive(appId: string): Promise<void> {
  console.log("💓 [STREAM MANAGER] Updating keep-alive for appId:", appId);
  await redisPublisher.set(`app:${appId}:stream-state`, "running", {
    EX: 15,
  });
}

/**
 * Handle stream lifecycle events (start, finish, error)
 */
export async function handleStreamLifecycle(
  appId: string,
  event: "start" | "finish" | "error"
): Promise<void> {
  console.log(`🎭 [STREAM MANAGER] Stream lifecycle event: ${event} for appId:`, appId);
  switch (event) {
    case "start":
      await updateKeepAlive(appId);
      break;
    case "finish":
    case "error":
      await clearStreamState(appId);
      break;
  }
}

/**
 * Send a message to the AI and handle all stream plumbing internally
 * This is the main interface that developers should use
 */
export async function sendMessageWithStreaming(
  agent: Agent,
  appId: string,
  mcpUrl: string,
  fs: FreestyleDevServerFilesystem,
  message: UIMessage
) {
  console.log("🚀 [STREAM MANAGER] sendMessageWithStreaming started");
  console.log("🤖 [STREAM MANAGER] Agent:", agent.name);
  console.log("🆔 [STREAM MANAGER] AppId:", appId);
  console.log("🔗 [STREAM MANAGER] MCP URL:", mcpUrl ? "YES" : "NO");
  console.log("💬 [STREAM MANAGER] Message:", message);
  
  const controller = new AbortController();
  let shouldAbort = false;

  // Set up abort callback
  console.log("🎯 [STREAM MANAGER] Setting up abort callback");
  await setupAbortCallback(appId, () => {
    shouldAbort = true;
    console.log("🛑 [STREAM MANAGER] Abort flag set to true");
  });

  let lastKeepAlive = Date.now();

  console.log("🤖 [STREAM MANAGER] Calling AIService.sendMessage");
  // Use the AI service to handle the AI interaction
  const aiResponse = await AIService.sendMessage(
    agent,
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
      async onChunk() {
        if (Date.now() - lastKeepAlive > 5000) {
          lastKeepAlive = Date.now();
          console.log("💓 [STREAM MANAGER] Sending keep-alive");
          await updateKeepAlive(appId);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async onStepFinish(_step: { response: { messages: unknown[] } }) {
        console.log("✅ [STREAM MANAGER] Step finished");
        if (shouldAbort) {
          console.log("🛑 [STREAM MANAGER] Aborting after step finish");
          await handleStreamLifecycle(appId, "error");
          controller.abort("Aborted stream after step finish");
          const messages = await AIService.getUnsavedMessages(appId);
          console.log("💾 [STREAM MANAGER] Unsaved messages:", messages);
          await AIService.saveMessagesToMemory(agent, appId, messages);
        }
      },
      onError: async (error: { error: unknown }) => {
        console.error("💥 [STREAM MANAGER] Stream error in manager:", error);
        await handleStreamLifecycle(appId, "error");
      },
      onFinish: async () => {
        console.log("🏁 [STREAM MANAGER] Stream finished");
        await handleStreamLifecycle(appId, "finish");
      },
      abortSignal: controller.signal,
    }
  );

  console.log("📦 [STREAM MANAGER] AI response received");
  console.log("🔍 [STREAM MANAGER] Stream has toUIMessageStreamResponse:", !!aiResponse.stream.toUIMessageStreamResponse);

  // Ensure the stream has the proper method
  if (!aiResponse.stream.toUIMessageStreamResponse) {
    console.error("❌ [STREAM MANAGER] Stream missing toUIMessageStreamResponse method!");
    throw new Error(
      "Invalid stream format - missing toUIMessageStreamResponse method"
    );
  }

  console.log("🆕 [STREAM MANAGER] Setting up stream");
  return await setStream(appId, message, aiResponse.stream);
}

/**
 * Clean up old stream states
 */
export async function cleanupOldStreams(maxAge = 3600000): Promise<void> {
  const now = Date.now();
  for (const [appId, state] of streamContext.getStreamStates().entries()) {
    if (now - state.timestamp > maxAge) {
      console.log("🧹 [STREAM MANAGER] Cleaning up old stream state for appId:", appId);
      await redisPublisher.del(`app:${appId}:stream-state`);
      console.log("✅ [STREAM MANAGER] Stream state cleared for old stream");
    }
  }
}

// Clean up old streams every hour
setInterval(cleanupOldStreams, 3600000);
