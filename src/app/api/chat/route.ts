import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { UIMessage } from "ai";
import { builderAgent } from "@/mastra/agents/builder";

// "fix" mastra mcp bug
import { EventEmitter } from "events";
import {
  isStreamRunning,
  stopStream,
  waitForStreamToStop,
  clearStreamState,
  sendMessageWithStreaming,
} from "@/lib/internal/stream-manager";
EventEmitter.defaultMaxListeners = 1000;

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("🚀 [CHAT ROUTE] Starting new chat stream");
  const appId = getAppIdFromHeaders(req);
  console.log("🔍 [CHAT ROUTE] App ID from headers:", appId);

  if (!appId) {
    console.error("❌ [CHAT ROUTE] Missing App Id header");
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  console.log("📱 [CHAT ROUTE] App found:", app ? "YES" : "NO");
  if (!app) {
    console.error("❌ [CHAT ROUTE] App not found");
    return new Response("App not found", { status: 404 });
  }

  // Check if a stream is already running and stop it if necessary
  const isRunning = await isStreamRunning(appId);
  console.log("🔄 [CHAT ROUTE] Stream already running:", isRunning);
  
  if (isRunning) {
    console.log("🛑 [CHAT ROUTE] Stopping previous stream for appId:", appId);
    await stopStream(appId);

    // Wait until stream state is cleared
    const stopped = await waitForStreamToStop(appId);
    console.log("⏳ [CHAT ROUTE] Stream stopped:", stopped);
    if (!stopped) {
      await clearStreamState(appId);
      console.error("❌ [CHAT ROUTE] Previous stream still shutting down");
      return new Response(
        "Previous stream is still shutting down, please try again",
        { status: 429 }
      );
    }
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  console.log("💬 [CHAT ROUTE] Messages received:", messages.length);
  console.log("📝 [CHAT ROUTE] Last message:", messages.at(-1));

  console.log("🌐 [CHAT ROUTE] Requesting dev server for repo:", app.info.gitRepo);
  const { mcpEphemeralUrl, fs } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
  });
  console.log("🔗 [CHAT ROUTE] MCP URL received:", mcpEphemeralUrl ? "YES" : "NO");

  console.log("🤖 [CHAT ROUTE] Starting sendMessageWithStreaming");
  try {
    const resumableStream = await sendMessageWithStreaming(
      builderAgent,
      appId,
      mcpEphemeralUrl,
      fs,
      messages.at(-1)!
    );
    console.log("✅ [CHAT ROUTE] sendMessageWithStreaming completed successfully");
    console.log("📤 [CHAT ROUTE] Returning response");
    return resumableStream.response();
  } catch (error) {
    console.error("💥 [CHAT ROUTE] Error in sendMessageWithStreaming:", error);
    throw error;
  }
}
