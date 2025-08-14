import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { builderAgent } from "@/mastra/agents/builder";
import { morphTool } from "@/tools/morph-tool";
import { fastApplyTool, batchEditTool, morphMetricsTool } from "@/tools/morph-fast-apply";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import { createChatGPTToolsets, ChatGPTMCPClient } from "@/lib/mcp-config";

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
      body?: ReadableStream<Uint8Array> | null;
    };
  };
}

export class AIService {
  /**
   * Send a message to the AI and get a stream response
   *
   * This is the main method developers should use for AI interactions.
   * It handles all the complex setup (MCP client, toolsets, memory, streaming)
   * and returns a clean response object with just the stream.
   *
   * All message list management and MCP client lifecycle is handled internally.
   *
   * @param agent - The Mastra agent to use for AI interactions
   * @param appId - The application ID
   * @param mcpUrl - The MCP server URL
   * @param message - The message to send to the AI
   * @param options - Optional configuration for the AI interaction
   * @returns Promise<AIResponse> - Contains only the stream for UI consumption
   *
   * @example
   * ```typescript
   * import { builderAgent } from "@/mastra/agents/builder";
   *
   * const response = await AIService.sendMessage(builderAgent, appId, mcpUrl, {
   *   id: crypto.randomUUID(),
   *   parts: [{ type: "text", text: "Build me a todo app" }],
   *   role: "user"
   * });
   *
   * // Use the stream for UI - that's all you need!
   * const uiStream = response.stream.toUIMessageStreamResponse();
   * ```
   */
  static async sendMessage(
    agent: Agent,
    appId: string,
    mcpUrl: string,
    fs: FreestyleDevServerFilesystem,
    message: UIMessage,
    options?: Partial<AIStreamOptions>
  ): Promise<AIResponse> {
    // Create MCP client directly
    const mcpClient = new MCPClient({
      id: crypto.randomUUID(),
      servers: {
        dev_server: {
          url: new URL(mcpUrl),
        },
      },
    });

    // Get toolsets from MCP client
    const toolsets = await mcpClient.getToolsets();

    // Save message to memory
    const memory = await agent.getMemory();
    if (memory) {
      await memory.saveMessages({
        messages: [
          {
            content: {
              parts: message.parts,
              format: 3,
            },
            role: "user",
            createdAt: new Date(),
            id: message.id,
            threadId: appId,
            type: "text",
            resourceId: appId,
          },
        ],
      });
    }

    const messageList = new MessageList({
      resourceId: appId,
      threadId: appId,
    });

    const stream = await agent.stream([message], {
      threadId: appId,
      resourceId: appId,
      maxSteps: options?.maxSteps ?? 100,
      maxRetries: options?.maxRetries ?? 0,
      maxOutputTokens: options?.maxOutputTokens ?? 64000,
      toolsets,
      async onChunk() {
        options?.onChunk?.();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async onStepFinish(step: { response: { messages: unknown[] } }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messageList.add(step.response.messages as any, "response");
        options?.onStepFinish?.(step);
      },
      onError: async (error: { error: unknown }) => {
        // Handle cleanup internally
        await mcpClient.disconnect();
        options?.onError?.(error);
      },
      onFinish: async () => {
        // Handle cleanup internally
        await mcpClient.disconnect();
        options?.onFinish?.();
      },
      abortSignal: options?.abortSignal,
    });

    // Ensure the stream has the proper method
    if (!stream.toUIMessageStreamResponse) {
      console.error(
        "Stream does not have toUIMessageStreamResponse method:",
        stream
      );
      throw new Error(
        "Invalid stream format - missing toUIMessageStreamResponse method"
      );
    }

    // Return only what developers need - the stream
    return {
      stream,
    };
  }

  /**
   * Get unsaved messages from memory
   */
  static async getUnsavedMessages(appId: string): Promise<any[]> {
    // This would typically interact with the memory system
    // For now, return empty array
    return [];
  }

  /**
   * Save messages to memory
   */
  static async saveMessagesToMemory(
    agent: Agent,
    appId: string,
    messages: any[]
  ): Promise<void> {
    const memory = await agent.getMemory();
    if (memory && messages.length > 0) {
      await memory.saveMessages({
        messages: messages.map((msg) => ({
          content: {
            parts: msg.parts || [{ type: "text", text: msg.text || "" }],
            format: 3,
          },
          role: msg.role || "assistant",
          createdAt: new Date(),
          id: msg.id || crypto.randomUUID(),
          threadId: appId,
          type: "text",
          resourceId: appId,
        })),
      });
    }
  }
}
