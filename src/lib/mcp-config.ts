import { MCPClient } from "@mastra/mcp";

/**
 * 🚀 MCP Configuration for ChatGPT Integration
 * 
 * This configuration is optimized for ChatGPT (GPT-4o) with Freestyle MCP tools.
 * It includes enhanced error handling, retry logic, and performance optimizations.
 */

export interface MCPConfig {
  id: string;
  servers: {
    dev_server: {
      url: URL;
    };
  };
  options?: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    keepAlive?: boolean;
  };
}

export const createMCPClient = (mcpUrl: string): MCPClient => {
  const config: MCPConfig = {
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpUrl),
      },
    },
    options: {
      timeout: parseInt(process.env.MCP_TIMEOUT || '30000'), // 30 seconds
      maxRetries: parseInt(process.env.MCP_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.MCP_RETRY_DELAY || '1000'), // 1 second
      keepAlive: process.env.MCP_KEEP_ALIVE === 'true',
    },
  };

  return new MCPClient(config);
};

/**
 * Enhanced MCP Client with ChatGPT-specific optimizations
 */
export class ChatGPTMCPClient {
  private client: MCPClient;
  private config: MCPConfig;

  constructor(mcpUrl: string) {
    this.config = {
      id: crypto.randomUUID(),
      servers: {
        dev_server: {
          url: new URL(mcpUrl),
        },
      },
      options: {
        timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
        maxRetries: parseInt(process.env.MCP_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.MCP_RETRY_DELAY || '1000'),
        keepAlive: process.env.MCP_KEEP_ALIVE === 'true',
      },
    };

    this.client = new MCPClient(this.config);
  }

  /**
   * Get toolsets with enhanced error handling for ChatGPT
   */
  async getToolsets() {
    try {
      const toolsets = await this.client.getToolsets();
      
      // Log available tools for debugging
      console.log('Available MCP toolsets:', Object.keys(toolsets));
      
      return toolsets;
    } catch (error) {
      console.error('Error getting MCP toolsets:', error);
      
      // Return empty toolsets if MCP fails
      return {};
    }
  }

  /**
   * Disconnect with proper cleanup
   */
  async disconnect() {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.error('Error disconnecting MCP client:', error);
    }
  }

  /**
   * Get client instance for direct access
   */
  getClient(): MCPClient {
    return this.client;
  }
}

/**
 * ChatGPT-optimized toolset configuration
 */
export const createChatGPTToolsets = async (
  mcpUrl: string,
  fs: any,
  includeMorph: boolean = false
) => {
  const mcpClient = new ChatGPTMCPClient(mcpUrl);
  const freestyleToolsets = await mcpClient.getToolsets();

  const toolsets: any = {
    ...freestyleToolsets,
  };

  // Add Morph tools if available and requested
  if (includeMorph && process.env.MORPH_API_KEY) {
    const { morphTool, fastApplyTool, batchEditTool, morphMetricsTool } = await import('@/tools/morph-fast-apply');
    
    toolsets.morph = {
      edit_file: morphTool(fs),
      fast_edit_file: fastApplyTool(fs),
      batch_edit_files: batchEditTool(fs),
      get_morph_metrics: morphMetricsTool(),
    };
  }

  return {
    toolsets,
    mcpClient,
  };
};

/**
 * Environment variables for MCP configuration
 */
export const MCP_ENV_VARS = {
  MCP_TIMEOUT: '30000',
  MCP_MAX_RETRIES: '3',
  MCP_RETRY_DELAY: '1000',
  MCP_KEEP_ALIVE: 'true',
  MCP_DEBUG: 'false',
} as const;
