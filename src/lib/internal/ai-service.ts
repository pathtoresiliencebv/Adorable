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
    const mcpClient = createMCPClient(mcpUrl);
    const toolsets = await mcpClient.getToolsets();

    // Add Morph tools if available
    if (isMorphEnabled()) {
      try {
        const { morphTool, fastApplyTool, batchEditTool, morphMetricsTool } = await import('@/tools/morph-fast-apply');
        
        toolsets.morph = {
          edit_file: morphTool(fs),
          fast_edit_file: fastApplyTool(fs),
          batch_edit_files: batchEditTool(fs),
          get_morph_metrics: morphMetricsTool(),
        };
      } catch (error) {
        console.warn('Failed to load Morph tools:', error);
      }
    }

    const messageList = new MessageList({
      resourceId: appId,
      threadId: appId,
    });

    const stream = await (agent || builderAgent).stream([message], {
      threadId: appId,
      resourceId: appId,
      maxSteps: options?.maxSteps ?? 100,
      maxRetries: options?.maxRetries ?? 0,
      maxOutputTokens: options?.maxOutputTokens ?? 64000,
      toolsets,
      async onChunk() {
        options?.onChunk?.();
      },
      async onStepFinish(step: { response: { messages: unknown[] } }) {
        messageList.add(step.response.messages as any, "response");
        options?.onStepFinish?.(step);
      },
      onError: async (error: { error: unknown }) => {
        await mcpClient.disconnect();
        options?.onError?.(error);
      },
      onFinish: async () => {
        await mcpClient.disconnect();
        options?.onFinish?.();
      },
      abortSignal: options?.abortSignal,
    });

    return {
      stream: {
        toUIMessageStreamResponse: () => ({
          body: stream,
        }),
      },
    };
  }
}
