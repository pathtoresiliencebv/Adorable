import { MCPClient } from "@mastra/mcp";

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
