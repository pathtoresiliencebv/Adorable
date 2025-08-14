# Externe Tools Integratie met MCP

## 🎯 **Overzicht**

Deze gids beschrijft hoe je externe tools kunt integreren met Morph LLM via MCP (Model Context Protocol). Door tools te integreren, kan het AI model toegang krijgen tot real-time data, externe APIs, databases en andere systemen.

## 🛠️ **Tool Categorieën**

### **1. File System Tools**
- **File Reading/Writing**: Directe toegang tot bestanden
- **Directory Operations**: Navigeren door mappen
- **File Search**: Zoeken naar specifieke bestanden
- **File Monitoring**: Real-time bestandswijzigingen

### **2. Database Tools**
- **SQL Queries**: Uitvoeren van database queries
- **Schema Inspection**: Database structuur analyseren
- **Data Validation**: Data integriteit controleren
- **Connection Management**: Database connecties beheren

### **3. API Tools**
- **HTTP Requests**: REST en GraphQL API calls
- **Authentication**: API authenticatie beheren
- **Rate Limiting**: API rate limiting respecteren
- **Response Caching**: API responses cachen

### **4. Development Tools**
- **Git Operations**: Version control integratie
- **Package Management**: Dependency management
- **Testing Tools**: Automated testing
- **Linting/Formatting**: Code quality tools

## 🔧 **Tool Implementatie**

### **Basis Tool Template**

```typescript
// tools/base-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export interface ToolDefinition {
  id: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler: (params: any) => Promise<any>;
}

export class BaseTool {
  static create(definition: ToolDefinition) {
    return createTool({
      id: definition.id,
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: async ({ context }) => {
        try {
          return await definition.handler(context);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    });
  }
}
```

### **File System Tool**

```typescript
// tools/filesystem-tool.ts
import { BaseTool } from "./base-tool";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

export const filesystemTool = BaseTool.create({
  id: "filesystem_operations",
  description: "Perform file system operations",
  inputSchema: z.object({
    operation: z.enum(["read", "write", "list", "search", "delete"]),
    path: z.string(),
    content: z.string().optional(),
    pattern: z.string().optional(),
  }),
  handler: async ({ operation, path: filePath, content, pattern }) => {
    switch (operation) {
      case "read":
        const fileContent = await fs.readFile(filePath, "utf-8");
        return { success: true, content: fileContent };

      case "write":
        await fs.writeFile(filePath, content || "");
        return { success: true, message: "File written successfully" };

      case "list":
        const items = await fs.readdir(filePath);
        const fileList = await Promise.all(
          items.map(async (item) => {
            const fullPath = path.join(filePath, item);
            const stats = await fs.stat(fullPath);
            return {
              name: item,
              path: fullPath,
              type: stats.isDirectory() ? "directory" : "file",
              size: stats.size,
              modified: stats.mtime,
            };
          })
        );
        return { success: true, items: fileList };

      case "search":
        const searchResults = await searchFiles(filePath, pattern || "");
        return { success: true, results: searchResults };

      case "delete":
        await fs.unlink(filePath);
        return { success: true, message: "File deleted successfully" };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});

async function searchFiles(dir: string, pattern: string): Promise<any[]> {
  const results: any[] = [];
  
  async function searchRecursive(currentDir: string) {
    const items = await fs.readdir(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await searchRecursive(fullPath);
      } else if (item.includes(pattern)) {
        results.push({
          name: item,
          path: fullPath,
          size: stats.size,
          modified: stats.mtime,
        });
      }
    }
  }
  
  await searchRecursive(dir);
  return results;
}
```

### **Database Tool**

```typescript
// tools/database-tool.ts
import { BaseTool } from "./base-tool";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const databaseTool = BaseTool.create({
  id: "database_operations",
  description: "Perform database operations",
  inputSchema: z.object({
    operation: z.enum(["query", "schema", "tables", "sample"]),
    sql: z.string().optional(),
    table: z.string().optional(),
    limit: z.number().optional(),
  }),
  handler: async ({ operation, sql, table, limit = 10 }) => {
    switch (operation) {
      case "query":
        if (!sql) throw new Error("SQL query is required");
        const result = await pool.query(sql);
        return {
          success: true,
          rows: result.rows,
          rowCount: result.rowCount,
        };

      case "schema":
        if (!table) throw new Error("Table name is required");
        const schemaQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `;
        const schemaResult = await pool.query(schemaQuery, [table]);
        return { success: true, schema: schemaResult.rows };

      case "tables":
        const tablesQuery = `
          SELECT table_name, table_type
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name
        `;
        const tablesResult = await pool.query(tablesQuery);
        return { success: true, tables: tablesResult.rows };

      case "sample":
        if (!table) throw new Error("Table name is required");
        const sampleQuery = `SELECT * FROM ${table} LIMIT $1`;
        const sampleResult = await pool.query(sampleQuery, [limit]);
        return { success: true, data: sampleResult.rows };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});
```

### **API Tool**

```typescript
// tools/api-tool.ts
import { BaseTool } from "./base-tool";
import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";

export const apiTool = BaseTool.create({
  id: "api_operations",
  description: "Make HTTP requests to external APIs",
  inputSchema: z.object({
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    data: z.any().optional(),
    timeout: z.number().optional(),
  }),
  handler: async ({ method, url, headers = {}, data, timeout = 30000 }) => {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      timeout,
    };

    if (data && method !== "GET") {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      };
    }
  },
});
```

## 🔗 **Tool Orchestration**

### **Sequential Tool Execution**

```typescript
// lib/tool-orchestrator.ts
export class ToolOrchestrator {
  constructor(private tools: Map<string, any>) {}

  async executeSequence(sequence: ToolStep[]): Promise<any[]> {
    const results: any[] = [];
    let context: any = {};

    for (const step of sequence) {
      const tool = this.tools.get(step.toolId);
      if (!tool) {
        throw new Error(`Tool ${step.toolId} not found`);
      }

      // Merge previous results into context
      const input = { ...step.input, ...context };
      
      const result = await tool.execute({ context: input });
      results.push(result);

      // Update context for next step
      if (step.outputKey) {
        context[step.outputKey] = result;
      }
    }

    return results;
  }

  async executeParallel(operations: ToolStep[]): Promise<any[]> {
    const promises = operations.map(async (step) => {
      const tool = this.tools.get(step.toolId);
      if (!tool) {
        throw new Error(`Tool ${step.toolId} not found`);
      }

      return await tool.execute({ context: step.input });
    });

    return await Promise.all(promises);
  }
}

interface ToolStep {
  toolId: string;
  input: any;
  outputKey?: string;
}
```

### **Conditional Tool Execution**

```typescript
// lib/conditional-tools.ts
export class ConditionalToolExecutor {
  constructor(private tools: Map<string, any>) {}

  async executeConditional(
    condition: (context: any) => boolean,
    trueStep: ToolStep,
    falseStep?: ToolStep
  ): Promise<any> {
    const context = await this.getCurrentContext();
    
    if (condition(context)) {
      return await this.executeStep(trueStep);
    } else if (falseStep) {
      return await this.executeStep(falseStep);
    }
    
    return null;
  }

  async executeStep(step: ToolStep): Promise<any> {
    const tool = this.tools.get(step.toolId);
    if (!tool) {
      throw new Error(`Tool ${step.toolId} not found`);
    }

    return await tool.execute({ context: step.input });
  }

  private async getCurrentContext(): Promise<any> {
    // Implementation to get current context
    return {};
  }
}
```

## 📊 **Tool Monitoring**

### **Performance Tracking**

```typescript
// lib/tool-monitoring.ts
export class ToolMonitoring {
  private static metrics = new Map<string, ToolMetrics>();

  static trackToolCall(toolId: string, startTime: number, success: boolean) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!this.metrics.has(toolId)) {
      this.metrics.set(toolId, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
      });
    }

    const metrics = this.metrics.get(toolId)!;
    metrics.totalCalls++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.totalCalls;

    if (success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }
  }

  static getToolMetrics(toolId: string): ToolMetrics | null {
    return this.metrics.get(toolId) || null;
  }

  static getAllMetrics(): Map<string, ToolMetrics> {
    return new Map(this.metrics);
  }

  static getPerformanceReport(): PerformanceReport {
    const report: PerformanceReport = {
      totalTools: this.metrics.size,
      totalCalls: 0,
      averageSuccessRate: 0,
      slowestTool: null,
      fastestTool: null,
    };

    let totalCalls = 0;
    let totalSuccess = 0;
    let slowestTool = null;
    let fastestTool = null;

    for (const [toolId, metrics] of this.metrics) {
      totalCalls += metrics.totalCalls;
      totalSuccess += metrics.successfulCalls;

      if (!slowestTool || metrics.averageDuration > slowestTool.duration) {
        slowestTool = { toolId, duration: metrics.averageDuration };
      }

      if (!fastestTool || metrics.averageDuration < fastestTool.duration) {
        fastestTool = { toolId, duration: metrics.averageDuration };
      }
    }

    report.totalCalls = totalCalls;
    report.averageSuccessRate = totalSuccess / totalCalls;
    report.slowestTool = slowestTool;
    report.fastestTool = fastestTool;

    return report;
  }
}

interface ToolMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalDuration: number;
  averageDuration: number;
}

interface PerformanceReport {
  totalTools: number;
  totalCalls: number;
  averageSuccessRate: number;
  slowestTool: { toolId: string; duration: number } | null;
  fastestTool: { toolId: string; duration: number } | null;
}
```

## 🔒 **Security Best Practices**

### **Input Validation**

```typescript
// lib/tool-security.ts
export class ToolSecurity {
  static validateInput(input: any, schema: z.ZodSchema): any {
    try {
      return schema.parse(input);
    } catch (error) {
      throw new Error(`Input validation failed: ${error}`);
    }
  }

  static sanitizePath(filePath: string): string {
    // Prevent directory traversal attacks
    const normalized = path.normalize(filePath);
    if (normalized.includes('..')) {
      throw new Error('Directory traversal not allowed');
    }
    return normalized;
  }

  static validateSQL(sql: string): boolean {
    // Basic SQL injection prevention
    const dangerousKeywords = [
      'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'
    ];
    
    const upperSQL = sql.toUpperCase();
    const hasDangerousKeyword = dangerousKeywords.some(keyword => 
      upperSQL.includes(keyword)
    );

    if (hasDangerousKeyword) {
      throw new Error('Potentially dangerous SQL operation detected');
    }

    return true;
  }

  static rateLimit(toolId: string, userId: string): boolean {
    // Implement rate limiting logic
    const key = `${toolId}:${userId}`;
    const now = Date.now();
    const window = 60000; // 1 minute
    const maxCalls = 100;

    // This is a simplified implementation
    // In production, use Redis or similar for distributed rate limiting
    return true;
  }
}
```

## 🧪 **Testing Tools**

### **Tool Testing Framework**

```typescript
// lib/tool-testing.ts
export class ToolTesting {
  static async testTool(tool: any, testCases: TestCase[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const startTime = Date.now();
      let success = false;
      let error = null;
      let result = null;

      try {
        result = await tool.execute({ context: testCase.input });
        success = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      const duration = Date.now() - startTime;

      results.push({
        testCase: testCase.name,
        success,
        duration,
        error,
        result,
        expected: testCase.expected,
      });
    }

    return results;
  }

  static generateTestReport(results: TestResult[]): TestReport {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;

    return {
      total,
      passed,
      failed,
      successRate: passed / total,
      averageDuration,
      failures: results.filter(r => !r.success),
    };
  }
}

interface TestCase {
  name: string;
  input: any;
  expected: any;
}

interface TestResult {
  testCase: string;
  success: boolean;
  duration: number;
  error: string | null;
  result: any;
  expected: any;
}

interface TestReport {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  averageDuration: number;
  failures: TestResult[];
}
```

## 📈 **Performance Optimization**

### **Tool Caching**

```typescript
// lib/tool-caching.ts
export class ToolCaching {
  private static cache = new Map<string, CacheEntry>();
  private static ttl = 300000; // 5 minutes

  static async getCachedResult(key: string, operation: () => Promise<any>): Promise<any> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const result = await operation();
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  static generateCacheKey(toolId: string, input: any): string {
    return crypto.createHash('md5')
      .update(`${toolId}:${JSON.stringify(input)}`)
      .digest('hex');
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static getCacheStats(): CacheStats {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values())
      .filter(entry => now - entry.timestamp < this.ttl);

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
    };
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
}
```

---

**Volgende Stappen**: Lees [context-management.md](./context-management.md) voor context en memory management.
