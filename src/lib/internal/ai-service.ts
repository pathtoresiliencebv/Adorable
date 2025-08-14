import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import { AgentFactory } from "@/mastra/agents/builder";
import { performanceTracker } from "@/lib/ai-models";

export interface AIStreamOptions {
  threadId: string;
  resourceId: string;
  taskType?: string; // New: specify task type for intelligent agent selection
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
   * @param agent - The Mastra agent to use for AI interactions (optional - will auto-select if not provided)
   * @param appId - The application ID
   * @param mcpUrl - The MCP server URL
   * @param message - The message to send to the AI
   * @param options - Optional configuration for the AI interaction
   * @returns Promise<AIResponse> - Contains only the stream for UI consumption
   *
   * @example
   * ```typescript
   * // Auto-select agent based on task
   * const response = await AIService.sendMessage(null, appId, mcpUrl, fs, {
   *   id: crypto.randomUUID(),
   *   parts: [{ type: "text", text: "Debug this authentication issue" }],
   *   role: "user"
   * }, { taskType: "debugging" });
   *
   * // Use specific agent
   * const response = await AIService.sendMessage(debuggingAgent, appId, mcpUrl, fs, message);
   * ```
   */
  static async sendMessage(
    agent: Agent | null,
    appId: string,
    mcpUrl: string,
    fs: FreestyleDevServerFilesystem,
    message: UIMessage,
    options?: Partial<AIStreamOptions>
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Auto-select agent if not provided
    if (!agent) {
      const taskType = options?.taskType || this.detectTaskType(message);
      agent = await AgentFactory.getAgentForTask(taskType);
      console.log(`🤖 Auto-selected agent for task: ${taskType} -> ${agent.name}`);
    }

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

    try {
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
          
          // Record error metrics
          const endTime = Date.now();
          performanceTracker.recordMetrics(agent.model?.modelId || 'unknown', {
            responseTime: endTime - startTime,
            tokenUsage: 0,
            successRate: 0,
            cost: 0
          });
          
          options?.onError?.(error);
        },
        onFinish: async () => {
          // Handle cleanup internally
          await mcpClient.disconnect();
          
          // Record success metrics
          const endTime = Date.now();
          performanceTracker.recordMetrics(agent.model?.modelId || 'unknown', {
            responseTime: endTime - startTime,
            tokenUsage: messageList.messages.length * 100, // Rough estimate
            successRate: 1,
            cost: 0 // Could be calculated based on actual token usage
          });
          
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
    } catch (error) {
      // Record error metrics
      const endTime = Date.now();
      performanceTracker.recordMetrics(agent.model?.modelId || 'unknown', {
        responseTime: endTime - startTime,
        tokenUsage: 0,
        successRate: 0,
        cost: 0
      });
      
      throw error;
    }
  }

  /**
   * Detect task type from message content
   */
  private static detectTaskType(message: UIMessage): string {
    const content = message.parts
      .map(part => (typeof part === 'string' ? part : part.text || ''))
      .join(' ')
      .toLowerCase();

    // Task detection logic
    if (content.includes('debug') || content.includes('error') || content.includes('fix') || content.includes('issue')) {
      return 'debugging';
    }
    
    if (content.includes('architecture') || content.includes('system design') || content.includes('database design')) {
      return 'architecture';
    }
    
    if (content.includes('ui') || content.includes('frontend') || content.includes('component') || content.includes('design')) {
      return 'ui-ux';
    }
    
    if (content.includes('backend') || content.includes('api') || content.includes('database')) {
      return 'backend';
    }
    
    if (content.includes('security') || content.includes('auth') || content.includes('secure')) {
      return 'security';
    }
    
    if (content.includes('performance') || content.includes('optimize') || content.includes('scale')) {
      return 'performance';
    }
    
    if (content.includes('test') || content.includes('qa') || content.includes('quality')) {
      return 'testing';
    }
    
    if (content.includes('document') || content.includes('tutorial') || content.includes('learn')) {
      return 'documentation';
    }
    
    if (content.length < 100 || content.includes('quick') || content.includes('simple')) {
      return 'quick-task';
    }
    
    // Default to code generation
    return 'code-generation';
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

  /**
   * Get agent statistics
   */
  static getAgentStats() {
    return AgentFactory.getAgentStats();
  }

  /**
   * Get performance metrics for all models
   */
  static getPerformanceMetrics() {
    const stats = AgentFactory.getAgentStats();
    const metrics: Record<string, any> = {};
    
    for (const [name, agentStats] of Object.entries(stats)) {
      if (agentStats.metrics) {
        metrics[name] = agentStats.metrics;
      }
    }
    
    return metrics;
  }
}
