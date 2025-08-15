import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import { builderAgent } from "@/mastra/agents/builder";
import { createMCPClient } from "@/lib/mcp-config";
import { isMorphEnabled } from "@/lib/morph-config";

export interface AIStreamOptions {
  threadId: string;
  resourceId: string;
  maxSteps?: number;
  maxRetries?: number;
  maxOutputTokens?: number;
  onChunk?: () => void;
  onStepFinish?: (step: { response: { messages: unknown[] } }) => void;
  onError?: (error: { error: unknown }) => void;
  onFinish?: () => void;
  abortSignal?: AbortSignal;
}

export interface AIResponse {
  stream: {
    toUIMessageStreamResponse: () => {
      body: ReadableStream;
    };
  };
}

export class AIService {
  static async sendMessage(
    agent: Agent | null,
    appId: string,
    mcpUrl: string,
    fs: FreestyleDevServerFilesystem,
    message: UIMessage,
    options?: Partial<AIStreamOptions>
  ): Promise<AIResponse> {
    console.log("🚀 [AI SERVICE] sendMessage started");
    console.log("🤖 [AI SERVICE] Agent:", agent?.name || "null (using builderAgent)");
    console.log("🆔 [AI SERVICE] AppId:", appId);
    console.log("🔗 [AI SERVICE] MCP URL:", mcpUrl);
    console.log("💬 [AI SERVICE] Message:", message);
    console.log("⚙️ [AI SERVICE] Options:", options);

    console.log("🔧 [AI SERVICE] Creating MCP client");
    const mcpClient = createMCPClient(mcpUrl);
    console.log("✅ [AI SERVICE] MCP client created");

    console.log("🛠️ [AI SERVICE] Getting toolsets");
    const toolsets = await mcpClient.getToolsets();
    console.log("✅ [AI SERVICE] Toolsets received:", Object.keys(toolsets));

    // Add Morph tools if available
    if (isMorphEnabled()) {
      console.log("🔧 [AI SERVICE] Morph is enabled, loading Morph tools");
      try {
        const { morphTool, fastApplyTool, batchEditTool, morphMetricsTool } = await import('@/tools/morph-fast-apply');
        console.log("✅ [AI SERVICE] Morph tools imported successfully");
        
        toolsets.morph = {
          edit_file: morphTool(fs),
          fast_edit_file: fastApplyTool(fs),
          batch_edit_files: batchEditTool(fs),
          get_morph_metrics: morphMetricsTool(),
        };
        console.log("✅ [AI SERVICE] Morph tools added to toolsets");
      } catch (error) {
        console.warn('⚠️ [AI SERVICE] Failed to load Morph tools:', error);
      }
    } else {
      console.log("ℹ️ [AI SERVICE] Morph is not enabled");
    }

    console.log("📝 [AI SERVICE] Creating message list");
    const messageList = new MessageList({
      resourceId: appId,
      threadId: appId,
    });
    console.log("✅ [AI SERVICE] Message list created");

    const selectedAgent = agent || builderAgent;
    console.log("🤖 [AI SERVICE] Using agent:", selectedAgent.name);
    console.log("🎯 [AI SERVICE] Agent model:", selectedAgent.model?.modelId);

    console.log("🔄 [AI SERVICE] Starting agent stream");
    try {
      const stream = await selectedAgent.stream([message], {
        threadId: appId,
        resourceId: appId,
        maxSteps: options?.maxSteps ?? 100,
        maxRetries: options?.maxRetries ?? 0,
        maxOutputTokens: options?.maxOutputTokens ?? 64000,
        toolsets,
        async onChunk() {
          console.log("📦 [AI SERVICE] Chunk received");
          options?.onChunk?.();
        },
        async onStepFinish(step: { response: { messages: unknown[] } }) {
          console.log("✅ [AI SERVICE] Step finished, messages:", step.response.messages.length);
          messageList.add(step.response.messages as any, "response");
          options?.onStepFinish?.(step);
        },
        onError: async (error: { error: unknown }) => {
          console.error("💥 [AI SERVICE] Stream error:", error);
          await mcpClient.disconnect();
          console.log("🔌 [AI SERVICE] MCP client disconnected due to error");
          options?.onError?.(error);
        },
        onFinish: async () => {
          console.log("🏁 [AI SERVICE] Stream finished");
          await mcpClient.disconnect();
          console.log("🔌 [AI SERVICE] MCP client disconnected");
          options?.onFinish?.();
        },
        abortSignal: options?.abortSignal,
      });

      console.log("✅ [AI SERVICE] Agent stream completed successfully");
      console.log("📦 [AI SERVICE] Stream object:", typeof stream);
      console.log("🔍 [AI SERVICE] Stream has toUIMessageStreamResponse:", !!stream.toUIMessageStreamResponse);

      return {
        stream: {
          toUIMessageStreamResponse: () => ({
            body: stream,
          }),
        },
      };
    } catch (error) {
      console.error("💥 [AI SERVICE] Error in agent stream:", error);
      throw error;
    }
  }
}
