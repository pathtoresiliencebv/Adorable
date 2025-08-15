import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import { AgentFactory, createFallbackMemory } from "@/mastra/agents/builder";
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
      body: ReadableStream;
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

    // Save message to memory with error handling
    try {
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
    } catch (memoryError) {
      console.warn("Failed to save message to memory, continuing without memory:", memoryError);
      // Continue without memory if database is not available
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
          
          // Handle specific AI_APICallError for reasoning items
          if (error.error && typeof error.error === 'object' && 'name' in error.error) {
            const apiError = error.error as any;
            if (apiError.name === 'AI_APICallError' && apiError.message?.includes('reasoning')) {
              console.warn('Reasoning item error detected, attempting recovery...');
              // Try to recover by using a simpler approach
              try {
                const fallbackStream = await agent.stream([message], {
                  threadId: appId,
                  resourceId: appId,
                  maxSteps: options?.maxSteps ?? 50,
                  maxRetries: 0,
                  maxOutputTokens: options?.maxOutputTokens ?? 32000,
                  toolsets,
                  async onChunk() {
                    options?.onChunk?.();
                  },
                  async onStepFinish(step: { response: { messages: unknown[] } }) {
                    messageList.add(step.response.messages as any, "response");
                    options?.onStepFinish?.(step);
                  },
                  onError: async (fallbackError: { error: unknown }) => {
                    await mcpClient.disconnect();
                    options?.onError?.(fallbackError);
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
                      body: fallbackStream,
                    }),
                  },
                };
              } catch (fallbackError) {
                console.error('Fallback stream also failed:', fallbackError);
              }
            }
          }
          
          options?.onError?.(error);
        },
        onFinish: async () => {
          // Handle cleanup internally
          await mcpClient.disconnect();
          
          // Record success metrics
          const endTime = Date.now();
          performanceTracker.recordMetrics(agent.model?.modelId || 'unknown', {
            responseTime: endTime - startTime,
            tokenUsage: 0,
            successRate: 1,
            cost: 0
          });
          
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
    } catch (error) {
      // Handle cleanup on error
      await mcpClient.disconnect();
      
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
    const text = message.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ')
      .toLowerCase();

    // Task detection logic
    if (text.includes('debug') || text.includes('error') || text.includes('fix')) {
      return 'debugging';
    }
    if (text.includes('ui') || text.includes('frontend') || text.includes('component')) {
      return 'ui-ux';
    }
    if (text.includes('backend') || text.includes('api') || text.includes('database')) {
      return 'backend';
    }
    if (text.includes('security') || text.includes('auth')) {
      return 'security';
    }
    if (text.includes('performance') || text.includes('optimize')) {
      return 'performance';
    }
    if (text.includes('test') || text.includes('qa')) {
      return 'testing';
    }
    if (text.includes('document') || text.includes('tutorial')) {
      return 'documentation';
    }
    if (text.includes('architecture') || text.includes('system design')) {
      return 'architecture';
    }

    return 'code-generation';
  }

  /**
   * Get unsaved messages from memory
   */
  static async getUnsavedMessages(appId: string): Promise<any[]> {
    // This would typically retrieve messages that haven't been saved yet
    // For now, return empty array
    return [];
  }

  /**
   * Save messages to memory
   */
  static async saveMessagesToMemory(agent: Agent, appId: string, messages: any[]): Promise<void> {
    try {
      const memory = await agent.getMemory();
      if (memory && messages.length > 0) {
        await memory.saveMessages({
          messages: messages.map(msg => ({
            content: {
              parts: msg.parts || [{ type: 'text', text: msg.content || '' }],
              format: 3,
            },
            role: msg.role || 'assistant',
            createdAt: new Date(),
            id: msg.id || crypto.randomUUID(),
            threadId: appId,
            type: 'text',
            resourceId: appId,
          })),
        });
      }
    } catch (memoryError) {
      console.warn("Failed to save messages to memory:", memoryError);
      // Continue without memory if database is not available
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
