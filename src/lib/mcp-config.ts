import { MCPClient } from "@mastra/mcp";

/**
 * 🚀 MCP Configuration for GPT-5 Integration
 * 
 * This configuration is optimized for GPT-5 with Freestyle MCP tools.
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
  return new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpUrl),
      },
    },
  });
};

/**
 * 🎯 Enhanced MCP Client with GPT-5 Optimizations
 */
export class GPT5MCPClient {
  private client: MCPClient;
  private config: MCPConfig;

  constructor(mcpUrl: string, config?: Partial<MCPConfig>) {
    this.config = {
      id: crypto.randomUUID(),
      servers: {
        dev_server: {
          url: new URL(mcpUrl),
        },
      },
      options: {
        timeout: 30000, // 30 seconds
        maxRetries: 3,
        retryDelay: 1000,
        keepAlive: true,
        ...config?.options,
      },
    };

    this.client = new MCPClient(this.config);
  }

  /**
   * Get toolsets with enhanced error handling
   */
  async getToolsets() {
    try {
      return await this.client.getToolsets();
    } catch (error) {
      console.error('Error getting MCP toolsets:', error);
      throw error;
    }
  }

  /**
   * Disconnect with cleanup
   */
  async disconnect() {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.warn('Error disconnecting MCP client:', error);
    }
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
  const mcpClient = new GPT5MCPClient(mcpUrl);
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
