# MCP Setup en Configuratie voor Morph LLM

## 🚀 **Quick Setup**

### **1. Installatie van MCP Client**

```bash
# Install MCP client
npm install @mastra/mcp

# Of met yarn
yarn add @mastra/mcp
```

### **2. Basis Configuratie**

```typescript
// src/lib/mcp-client.ts
import { MCPClient } from "@mastra/mcp";

export const mcpClient = new MCPClient({
  id: crypto.randomUUID(),
  servers: {
    // File System Server
    filesystem: {
      url: new URL("http://localhost:3001"),
    },
    // Database Server
    database: {
      url: new URL("http://localhost:3002"),
    },
    // API Server
    api: {
      url: new URL("http://localhost:3003"),
    },
  },
});
```

### **3. Integratie met Morph LLM**

```typescript
// src/lib/morph-mcp-integration.ts
import { mcpClient } from "./mcp-client";
import { morphTool } from "@/tools/morph-tool";

export class MorphMCPIntegration {
  private client: MCPClient;

  constructor() {
    this.client = mcpClient;
  }

  async initialize() {
    await this.client.connect();
    const toolsets = await this.client.getToolsets();
    return toolsets;
  }

  async enhanceMorphTool(fs: any) {
    const enhancedTool = {
      ...morphTool(fs),
      mcpTools: await this.client.getTools(),
    };
    return enhancedTool;
  }
}
```

## 🛠️ **MCP Server Setup**

### **File System Server**

```typescript
// servers/filesystem-server.ts
import { createServer } from "@mastra/mcp/server";

const filesystemServer = createServer({
  name: "filesystem",
  version: "1.0.0",
  tools: {
    read_file: {
      description: "Read a file from the filesystem",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
      handler: async ({ path }) => {
        // Implementation
        return { content: await fs.readFile(path) };
      },
    },
    write_file: {
      description: "Write content to a file",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
      handler: async ({ path, content }) => {
        await fs.writeFile(path, content);
        return { success: true };
      },
    },
  },
});

filesystemServer.listen(3001);
```

### **Database Server**

```typescript
// servers/database-server.ts
import { createServer } from "@mastra/mcp/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const databaseServer = createServer({
  name: "database",
  version: "1.0.0",
  tools: {
    query: {
      description: "Execute a SQL query",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string" },
          params: { type: "array" },
        },
        required: ["sql"],
      },
      handler: async ({ sql, params = [] }) => {
        const result = await pool.query(sql, params);
        return { rows: result.rows, rowCount: result.rowCount };
      },
    },
    schema: {
      description: "Get database schema information",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string" },
        },
      },
      handler: async ({ table }) => {
        const query = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
        `;
        const result = await pool.query(query, [table]);
        return { schema: result.rows };
      },
    },
  },
});

databaseServer.listen(3002);
```

### **API Server**

```typescript
// servers/api-server.ts
import { createServer } from "@mastra/mcp/server";
import axios from "axios";

const apiServer = createServer({
  name: "api",
  version: "1.0.0",
  tools: {
    http_request: {
      description: "Make HTTP requests to external APIs",
      inputSchema: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
          url: { type: "string" },
          headers: { type: "object" },
          data: { type: "object" },
        },
        required: ["method", "url"],
      },
      handler: async ({ method, url, headers = {}, data }) => {
        const response = await axios({
          method,
          url,
          headers,
          data,
        });
        return {
          status: response.status,
          data: response.data,
          headers: response.headers,
        };
      },
    },
  },
});

apiServer.listen(3003);
```

## 🔧 **Geavanceerde Configuratie**

### **Custom Tool Development**

```typescript
// tools/custom-mcp-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const customMCPTool = (mcpClient: MCPClient) =>
  createTool({
    id: "custom_mcp_operation",
    description: "Custom operation using MCP",
    inputSchema: z.object({
      operation: z.string(),
      data: z.any(),
    }),
    execute: async ({ context: { operation, data } }) => {
      // Use MCP client to perform operation
      const result = await mcpClient.callTool(operation, data);
      return result;
    },
  });
```

### **Error Handling en Retry Logic**

```typescript
// lib/mcp-error-handler.ts
export class MCPErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        console.warn(`MCP operation failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    throw new Error("Max retries exceeded");
  }

  static handleMCPError(error: any): string {
    if (error.code === "ECONNREFUSED") {
      return "MCP server is not running. Please start the server first.";
    }
    if (error.code === "TIMEOUT") {
      return "MCP operation timed out. Please try again.";
    }
    return `MCP error: ${error.message}`;
  }
}
```

### **Performance Monitoring**

```typescript
// lib/mcp-monitoring.ts
export class MCPMonitoring {
  private static metrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageResponseTime: 0,
  };

  static trackCall(success: boolean, responseTime: number) {
    this.metrics.totalCalls++;
    
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }

    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalCalls - 1) + responseTime) / 
      this.metrics.totalCalls;
  }

  static getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.successfulCalls / this.metrics.totalCalls,
    };
  }
}
```

## 📋 **Environment Variables**

```env
# MCP Configuration
MCP_FILESYSTEM_URL=http://localhost:3001
MCP_DATABASE_URL=http://localhost:3002
MCP_API_URL=http://localhost:3003

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Configuration
API_TIMEOUT=30000
API_MAX_RETRIES=3

# Monitoring Configuration
MCP_MONITORING_ENABLED=true
MCP_METRICS_RETENTION=86400000
```

## 🧪 **Testing Setup**

### **Unit Tests**

```typescript
// __tests__/mcp-integration.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MCPClient } from "@mastra/mcp";

describe('MCP Integration', () => {
  let mcpClient: MCPClient;

  beforeEach(() => {
    mcpClient = new MCPClient({
      id: 'test-client',
      servers: {
        test: { url: new URL('http://localhost:3001') }
      }
    });
  });

  it('should connect to MCP server', async () => {
    await expect(mcpClient.connect()).resolves.not.toThrow();
  });

  it('should discover tools', async () => {
    await mcpClient.connect();
    const tools = await mcpClient.getTools();
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
  });
});
```

### **Integration Tests**

```typescript
// __tests__/mcp-morph-integration.test.ts
import { describe, it, expect } from '@jest/globals';
import { MorphMCPIntegration } from '../src/lib/morph-mcp-integration';

describe('Morph MCP Integration', () => {
  it('should enhance morph tool with MCP capabilities', async () => {
    const integration = new MorphMCPIntegration();
    await integration.initialize();
    
    const enhancedTool = await integration.enhanceMorphTool(mockFs);
    expect(enhancedTool.mcpTools).toBeDefined();
  });
});
```

## 🚀 **Deployment**

### **Docker Setup**

```dockerfile
# Dockerfile.mcp
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001 3002 3003

CMD ["npm", "run", "start:mcp"]
```

### **Docker Compose**

```yaml
# docker-compose.mcp.yml
version: '3.8'

services:
  filesystem-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production

  database-server:
    build: .
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=${DATABASE_URL}

  api-server:
    build: .
    ports:
      - "3003:3003"
    environment:
      - API_TIMEOUT=${API_TIMEOUT}
```

## 🔒 **Security Best Practices**

### **Authentication**

```typescript
// lib/mcp-auth.ts
export class MCPAuthentication {
  static async authenticate(credentials: any): Promise<boolean> {
    // Implement authentication logic
    return true;
  }

  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### **Authorization**

```typescript
// lib/mcp-authorization.ts
export class MCPAuthorization {
  static async authorize(operation: string, user: any): Promise<boolean> {
    // Implement authorization logic
    return true;
  }
}
```

## 📊 **Monitoring en Logging**

### **Structured Logging**

```typescript
// lib/mcp-logging.ts
export class MCPLogging {
  static log(level: string, message: string, metadata: any = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    }));
  }
}
```

---

**Volgende Stappen**: Lees [prompting-strategies.md](./prompting-strategies.md) voor geavanceerde prompting technieken.
