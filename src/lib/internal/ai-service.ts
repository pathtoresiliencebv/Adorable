import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import { builderAgent, getAgentForTask } from "@/mastra/agents/builder";
import { createMCPClient } from "@/lib/mcp-config";
import { isMorphEnabled } from "@/lib/morph-config";

export interface AIStreamOptions {
  threadId: string;
  resourceId: string;
  taskType?: string; // Add task type for model selection
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

    // Select the best agent based on task type
    let selectedAgent = agent;
    if (!selectedAgent) {
      const taskType = options?.taskType || this.detectTaskType(message);
      selectedAgent = getAgentForTask(taskType);
      console.log(`🤖 Selected model for task: ${taskType} -> ${selectedAgent.model?.modelId}`);
    }

    const messageList = new MessageList({
      resourceId: appId,
      threadId: appId,
    });

    const stream = await selectedAgent.stream([message], {
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

  // Detect task type from message content
  private static detectTaskType(message: UIMessage): string {
    const text = message.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ')
      .toLowerCase();

    // Task detection logic
    if (text.includes('debug') || text.includes('error') || text.includes('fix')) {
      return 'debugging';
    }
    if (text.includes('architecture') || text.includes('system design')) {
      return 'architecture';
    }
    if (text.includes('security') || text.includes('auth')) {
      return 'security';
    }
    if (text.includes('performance') || text.includes('optimize')) {
      return 'performance';
    }
    if (text.includes('complex') || text.includes('advanced')) {
      return 'complex';
    }

    return 'code-generation';
  }
}
