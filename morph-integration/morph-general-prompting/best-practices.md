# Best Practices voor Morph LLM met MCP

## 🎯 **Algemene Principes**

### **1. Context-First Approach**
- Begin altijd met het verzamelen van relevante context
- Gebruik MCP tools om real-time data op te halen
- Valideer context voordat je het gebruikt in prompts

### **2. Tool Selection Strategy**
- Kies tools op basis van de taak, niet op beschikbaarheid
- Combineer tools voor complexe taken
- Monitor tool performance en gebruik

### **3. Error Handling**
- Implementeer graceful degradation
- Log errors voor debugging
- Geef gebruikers duidelijke foutmeldingen

## 📝 **Prompting Best Practices**

### **1. Structuur van Effectieve Prompts**

```typescript
// Goede prompt structuur
const effectivePrompt = `
# Context
${projectContext}
${databaseContext}
${apiContext}

# Available Tools
${availableTools}

# User Request
${userRequest}

# Instructions
1. Analyze the context and requirements
2. Select appropriate tools
3. Execute tools in logical sequence
4. Validate results
5. Provide comprehensive response

# Constraints
- Follow existing code patterns
- Maintain data integrity
- Optimize for performance
`;
```

### **2. Context Management**

```typescript
// Context verzameling
class ContextManager {
  async gatherContext(request: string): Promise<Context> {
    const context: Context = {
      project: await this.getProjectContext(),
      database: await this.getDatabaseContext(),
      files: await this.getRelevantFiles(request),
      tools: await this.getAvailableTools(),
    };

    return this.validateContext(context);
  }

  private validateContext(context: Context): Context {
    // Valideer en filter context
    return {
      ...context,
      files: context.files.filter(f => f.relevance > 0.7),
      tools: context.tools.filter(t => t.available),
    };
  }
}
```

### **3. Dynamic Prompt Generation**

```typescript
// Dynamische prompt generatie
class DynamicPromptGenerator {
  async generatePrompt(request: string, context: Context): Promise<string> {
    const relevantContext = this.filterRelevantContext(request, context);
    const toolInstructions = this.generateToolInstructions(relevantContext.tools);
    
    return `
# Current Context
${this.formatContext(relevantContext)}

# Task
${request}

# Available Tools
${toolInstructions}

# Instructions
${this.generateInstructions(request, relevantContext)}
    `.trim();
  }

  private filterRelevantContext(request: string, context: Context): Context {
    // Filter context op basis van relevantie voor de request
    const keywords = this.extractKeywords(request);
    return {
      ...context,
      files: context.files.filter(f => 
        keywords.some(k => f.content.toLowerCase().includes(k))
      ),
    };
  }
}
```

## 🔧 **Tool Integration Best Practices**

### **1. Tool Design Patterns**

```typescript
// Consistent tool interface
interface ToolInterface {
  id: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute: (params: any) => Promise<ToolResult>;
  validate?: (params: any) => boolean;
  cache?: boolean;
  rateLimit?: number;
}

// Tool result standaard
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    cacheHit?: boolean;
    retries?: number;
  };
}
```

### **2. Error Handling in Tools**

```typescript
// Robuuste error handling
class RobustTool {
  async execute(params: any): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Input validatie
      this.validateInput(params);
      
      // Rate limiting check
      this.checkRateLimit();
      
      // Execute met retry logic
      const result = await this.executeWithRetry(params);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  private async executeWithRetry(params: any, maxRetries = 3): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.performOperation(params);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        if (this.isRetryableError(error)) {
          await this.delay(Math.pow(2, i) * 1000);
          continue;
        }
        throw error;
      }
    }
  }
}
```

### **3. Tool Caching Strategy**

```typescript
// Intelligent caching
class CachedTool {
  private cache = new Map<string, CacheEntry>();
  private ttl = 300000; // 5 minutes

  async execute(params: any): Promise<ToolResult> {
    const cacheKey = this.generateCacheKey(params);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return {
        success: true,
        data: cached.data,
        metadata: { cacheHit: true },
      };
    }

    const result = await this.performOperation(params);
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return {
      success: true,
      data: result,
      metadata: { cacheHit: false },
    };
  }

  private generateCacheKey(params: any): string {
    return crypto.createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
  }
}
```

## 📊 **Performance Best Practices**

### **1. Parallel Execution**

```typescript
// Parallel tool execution
class ParallelExecutor {
  async executeParallel(tools: ToolStep[]): Promise<ToolResult[]> {
    const promises = tools.map(async (tool) => {
      const startTime = Date.now();
      
      try {
        const result = await tool.execute();
        return {
          ...result,
          metadata: {
            ...result.metadata,
            executionTime: Date.now() - startTime,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }
    });

    return await Promise.all(promises);
  }
}
```

### **2. Resource Management**

```typescript
// Resource pooling
class ResourcePool {
  private pools = new Map<string, Pool>();

  async getResource(type: string): Promise<any> {
    if (!this.pools.has(type)) {
      this.pools.set(type, this.createPool(type));
    }

    const pool = this.pools.get(type)!;
    return await pool.acquire();
  }

  async releaseResource(type: string, resource: any): Promise<void> {
    const pool = this.pools.get(type);
    if (pool) {
      await pool.release(resource);
    }
  }

  private createPool(type: string): Pool {
    switch (type) {
      case 'database':
        return new DatabasePool();
      case 'api':
        return new APIPool();
      default:
        throw new Error(`Unknown pool type: ${type}`);
    }
  }
}
```

## 🔒 **Security Best Practices**

### **1. Input Validation**

```typescript
// Comprehensive input validation
class SecurityValidator {
  static validateInput(input: any, schema: z.ZodSchema): any {
    try {
      return schema.parse(input);
    } catch (error) {
      throw new Error(`Input validation failed: ${error}`);
    }
  }

  static sanitizePath(path: string): string {
    const normalized = path.normalize(path);
    
    // Prevent directory traversal
    if (normalized.includes('..')) {
      throw new Error('Directory traversal not allowed');
    }
    
    // Prevent absolute paths
    if (path.isAbsolute(normalized)) {
      throw new Error('Absolute paths not allowed');
    }
    
    return normalized;
  }

  static validateSQL(sql: string): boolean {
    // SQL injection prevention
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /TRUNCATE\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new Error('Potentially dangerous SQL operation detected');
      }
    }

    return true;
  }
}
```

### **2. Authentication & Authorization**

```typescript
// Secure authentication
class SecurityManager {
  static async authenticate(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return decoded as User;
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  static async authorize(user: User, operation: string, resource: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(user.id);
    return permissions.some(p => 
      p.operation === operation && p.resource === resource
    );
  }

  static async auditLog(user: User, operation: string, details: any): Promise<void> {
    await this.logAudit({
      userId: user.id,
      operation,
      details,
      timestamp: new Date(),
      ip: this.getClientIP(),
    });
  }
}
```

## 📈 **Monitoring Best Practices**

### **1. Comprehensive Logging**

```typescript
// Structured logging
class Logger {
  static log(level: string, message: string, metadata: any = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    console.log(JSON.stringify(logEntry));
  }

  static logToolExecution(toolId: string, params: any, result: any, duration: number) {
    this.log('info', 'Tool execution completed', {
      toolId,
      params: this.sanitizeParams(params),
      result: this.sanitizeResult(result),
      duration,
    });
  }

  private static sanitizeParams(params: any): any {
    // Remove sensitive information
    const sanitized = { ...params };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.apiKey;
    return sanitized;
  }

  private static sanitizeResult(result: any): any {
    // Limit result size for logging
    if (typeof result === 'string' && result.length > 1000) {
      return result.substring(0, 1000) + '...';
    }
    return result;
  }
}
```

### **2. Performance Monitoring**

```typescript
// Performance tracking
class PerformanceMonitor {
  private static metrics = new Map<string, MetricData>();

  static trackMetric(name: string, value: number, tags: Record<string, string> = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        tags,
      });
    }

    const metric = this.metrics.get(name)!;
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
  }

  static getMetrics(): Map<string, MetricData> {
    return new Map(this.metrics);
  }

  static generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: new Date(),
      metrics: {},
    };

    for (const [name, data] of this.metrics) {
      report.metrics[name] = {
        average: data.sum / data.count,
        min: data.min,
        max: data.max,
        count: data.count,
        tags: data.tags,
      };
    }

    return report;
  }
}

interface MetricData {
  count: number;
  sum: number;
  min: number;
  max: number;
  tags: Record<string, string>;
}

interface PerformanceReport {
  timestamp: Date;
  metrics: Record<string, {
    average: number;
    min: number;
    max: number;
    count: number;
    tags: Record<string, string>;
  }>;
}
```

## 🧪 **Testing Best Practices**

### **1. Unit Testing**

```typescript
// Comprehensive unit tests
describe('Tool Integration', () => {
  it('should handle successful tool execution', async () => {
    const tool = new MockTool();
    const result = await tool.execute({ test: 'data' });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle tool errors gracefully', async () => {
    const tool = new MockTool({ shouldFail: true });
    const result = await tool.execute({ test: 'data' });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should respect rate limits', async () => {
    const tool = new RateLimitedTool({ maxCalls: 2 });
    
    await tool.execute({ test: 'data' });
    await tool.execute({ test: 'data' });
    
    await expect(tool.execute({ test: 'data' }))
      .rejects.toThrow('Rate limit exceeded');
  });
});
```

### **2. Integration Testing**

```typescript
// Integration tests
describe('MCP Integration', () => {
  let mcpClient: MCPClient;

  beforeEach(async () => {
    mcpClient = new MCPClient({
      id: 'test-client',
      servers: {
        test: { url: new URL('http://localhost:3001') }
      }
    });
    await mcpClient.connect();
  });

  afterEach(async () => {
    await mcpClient.disconnect();
  });

  it('should execute tool sequence successfully', async () => {
    const sequence = [
      { toolId: 'read_file', input: { path: 'test.txt' } },
      { toolId: 'process_data', input: { data: '{{previous_result}}' } },
    ];

    const results = await mcpClient.executeSequence(sequence);
    
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });
});
```

## 🔄 **Continuous Improvement**

### **1. A/B Testing**

```typescript
// A/B testing framework
class ABTesting {
  private variants = new Map<string, string>();
  private results = new Map<string, TestResult[]>();

  addVariant(name: string, prompt: string) {
    this.variants.set(name, prompt);
    this.results.set(name, []);
  }

  async testVariant(name: string, testCase: any): Promise<any> {
    const prompt = this.variants.get(name);
    if (!prompt) throw new Error(`Variant ${name} not found`);

    const startTime = Date.now();
    const result = await this.executePrompt(prompt, testCase);
    const duration = Date.now() - startTime;

    this.results.get(name)?.push({
      testCase,
      result,
      duration,
      timestamp: new Date(),
    });

    return result;
  }

  getBestVariant(): string {
    let bestVariant = '';
    let bestScore = 0;

    for (const [name, results] of this.results) {
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const successRate = results.filter(r => r.result.success).length / results.length;
      const score = successRate / avgDuration;

      if (score > bestScore) {
        bestScore = score;
        bestVariant = name;
      }
    }

    return bestVariant;
  }
}
```

### **2. Feedback Loop**

```typescript
// Feedback collection
class FeedbackCollector {
  static async collectFeedback(
    prompt: string,
    result: any,
    userRating: number,
    userComment?: string
  ): Promise<void> {
    const feedback = {
      prompt,
      result,
      userRating,
      userComment,
      timestamp: new Date(),
      metadata: {
        toolUsage: this.extractToolUsage(result),
        executionTime: this.extractExecutionTime(result),
      },
    };

    await this.storeFeedback(feedback);
    await this.updateMetrics(feedback);
  }

  private static extractToolUsage(result: any): string[] {
    // Extract which tools were used
    return result.metadata?.toolsUsed || [];
  }

  private static extractExecutionTime(result: any): number {
    return result.metadata?.executionTime || 0;
  }
}
```

---

**Volgende Stappen**: Implementeer deze best practices in je project en monitor de resultaten.
