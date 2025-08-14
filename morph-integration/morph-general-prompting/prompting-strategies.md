# Geavanceerde Prompting Strategieën voor Morph LLM

## 🎯 **Prompting Fundamentals**

### **Wat is Effectieve Prompting?**

Effectieve prompting is de kunst van het formuleren van instructies die het AI model helpen om de gewenste output te produceren. Met MCP integratie kunnen we deze prompts verrijken met real-time context en externe tools.

## 🏗️ **Prompt Architectuur**

### **1. Context-Rijke Prompts**

```typescript
// src/lib/prompt-templates.ts
export class PromptBuilder {
  private context: any[] = [];
  private tools: any[] = [];
  private constraints: any[] = [];

  addContext(context: any) {
    this.context.push(context);
    return this;
  }

  addTool(tool: any) {
    this.tools.push(tool);
    return this;
  }

  addConstraint(constraint: string) {
    this.constraints.push(constraint);
    return this;
  }

  build(): string {
    return `
# Context
${this.context.map(c => `- ${c}`).join('\n')}

# Available Tools
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

# Constraints
${this.constraints.map(c => `- ${c}`).join('\n')}

# Instructions
Please use the available tools and context to complete the task.
    `.trim();
  }
}
```

### **2. Dynamic Prompt Generation**

```typescript
// src/lib/dynamic-prompts.ts
export class DynamicPromptGenerator {
  constructor(private mcpClient: MCPClient) {}

  async generateContextAwarePrompt(userRequest: string): Promise<string> {
    // Gather relevant context
    const fileContext = await this.getFileContext();
    const databaseContext = await this.getDatabaseContext();
    const apiContext = await this.getAPIContext();

    return `
# Current Project Context
${fileContext}

# Database Schema
${databaseContext}

# API Endpoints
${apiContext}

# User Request
${userRequest}

# Instructions
Based on the current context, please provide the most accurate and relevant response.
    `.trim();
  }

  private async getFileContext(): Promise<string> {
    const files = await this.mcpClient.callTool('list_files', { path: './src' });
    return `Project files: ${files.join(', ')}`;
  }

  private async getDatabaseContext(): Promise<string> {
    const schema = await this.mcpClient.callTool('get_schema', {});
    return `Database schema: ${JSON.stringify(schema)}`;
  }

  private async getAPIContext(): Promise<string> {
    const endpoints = await this.mcpClient.callTool('list_endpoints', {});
    return `Available APIs: ${endpoints.join(', ')}`;
  }
}
```

## 🎨 **Prompting Patterns**

### **1. Chain-of-Thought Prompting**

```typescript
// src/lib/chain-of-thought.ts
export class ChainOfThoughtPrompting {
  static generateCOTPrompt(problem: string): string {
    return `
# Problem
${problem}

# Instructions
Please solve this step by step:

1. First, analyze the problem and identify the key components
2. Then, break down the solution into logical steps
3. For each step, explain your reasoning
4. Finally, provide the complete solution

Let's start:
    `.trim();
  }

  static generateCodeCOTPrompt(codeRequest: string): string {
    return `
# Code Request
${codeRequest}

# Instructions
Please write code step by step:

1. First, understand the requirements
2. Then, design the solution architecture
3. Next, implement each component
4. Finally, test and validate the code

Let's begin:
    `.trim();
  }
}
```

### **2. Few-Shot Learning**

```typescript
// src/lib/few-shot-prompts.ts
export class FewShotPrompting {
  static generateCodeExamplePrompt(examples: any[], request: string): string {
    const examplesText = examples.map(ex => `
# Example ${ex.id}
Input: ${ex.input}
Output: ${ex.output}
Explanation: ${ex.explanation}
    `).join('\n');

    return `
# Examples
${examplesText}

# Your Request
${request}

# Instructions
Based on the examples above, please provide a similar solution for your request.
    `.trim();
  }

  static async generateDynamicExamples(mcpClient: MCPClient, request: string): Promise<any[]> {
    // Use MCP to find similar examples in the codebase
    const similarFiles = await mcpClient.callTool('search_files', {
      query: request,
      pattern: '*.ts,*.js,*.tsx,*.jsx'
    });

    return similarFiles.slice(0, 3).map(file => ({
      id: file.name,
      input: file.content,
      output: 'Similar implementation',
      explanation: 'Based on existing codebase patterns'
    }));
  }
}
```

### **3. Self-Consistency Prompting**

```typescript
// src/lib/self-consistency.ts
export class SelfConsistencyPrompting {
  static generateMultiApproachPrompt(problem: string): string {
    return `
# Problem
${problem}

# Instructions
Please solve this problem using 3 different approaches:

## Approach 1: Simple and Direct
[Provide solution using the most straightforward method]

## Approach 2: Optimized and Efficient
[Provide solution with performance optimizations]

## Approach 3: Robust and Scalable
[Provide solution that handles edge cases and scales well]

## Final Recommendation
Based on the three approaches, recommend the best solution and explain why.
    `.trim();
  }
}
```

## 🔧 **Tool-Enhanced Prompting**

### **1. Tool-Aware Prompts**

```typescript
// src/lib/tool-aware-prompts.ts
export class ToolAwarePrompting {
  constructor(private mcpClient: MCPClient) {}

  async generateToolEnhancedPrompt(request: string): Promise<string> {
    const availableTools = await this.mcpClient.getTools();
    const relevantTools = this.filterRelevantTools(availableTools, request);

    return `
# Available Tools
${relevantTools.map(tool => `
## ${tool.name}
- Description: ${tool.description}
- Input Schema: ${JSON.stringify(tool.inputSchema)}
- Example Usage: ${tool.example || 'N/A'}
`).join('\n')}

# User Request
${request}

# Instructions
Please use the most appropriate tools to complete this request. For each tool you use:
1. Explain why you chose it
2. Show the exact parameters you'll use
3. Execute the tool
4. Process the results
    `.trim();
  }

  private filterRelevantTools(tools: any[], request: string): any[] {
    // Simple keyword matching - could be enhanced with semantic search
    const keywords = request.toLowerCase().split(' ');
    return tools.filter(tool => 
      keywords.some(keyword => 
        tool.name.toLowerCase().includes(keyword) ||
        tool.description.toLowerCase().includes(keyword)
      )
    );
  }
}
```

### **2. Multi-Tool Orchestration**

```typescript
// src/lib/tool-orchestration.ts
export class ToolOrchestrationPrompting {
  static generateOrchestrationPrompt(request: string, toolSequence: any[]): string {
    const sequenceText = toolSequence.map((step, index) => `
## Step ${index + 1}: ${step.tool}
- Purpose: ${step.purpose}
- Input: ${JSON.stringify(step.input)}
- Expected Output: ${step.expectedOutput}
    `).join('\n');

    return `
# Multi-Tool Request
${request}

# Tool Sequence
${sequenceText}

# Instructions
Please execute this sequence of tools in order. After each step:
1. Verify the output matches expectations
2. Use the output as input for the next step
3. Handle any errors gracefully
4. Provide a summary of the final result
    `.trim();
  }
}
```

## 📊 **Context-Aware Prompting**

### **1. Project-Aware Prompts**

```typescript
// src/lib/project-aware-prompts.ts
export class ProjectAwarePrompting {
  constructor(private mcpClient: MCPClient) {}

  async generateProjectContextPrompt(request: string): Promise<string> {
    const projectStructure = await this.getProjectStructure();
    const dependencies = await this.getDependencies();
    const recentChanges = await this.getRecentChanges();

    return `
# Project Context
## Structure
${projectStructure}

## Dependencies
${dependencies}

## Recent Changes
${recentChanges}

# User Request
${request}

# Instructions
Please consider the current project structure, dependencies, and recent changes when providing your solution. Ensure compatibility with existing code patterns and conventions.
    `.trim();
  }

  private async getProjectStructure(): Promise<string> {
    const structure = await this.mcpClient.callTool('get_project_structure', {});
    return structure.map((item: any) => `- ${item.path}: ${item.type}`).join('\n');
  }

  private async getDependencies(): Promise<string> {
    const deps = await this.mcpClient.callTool('read_file', { path: 'package.json' });
    const packageJson = JSON.parse(deps.content);
    return Object.entries(packageJson.dependencies || {})
      .map(([name, version]) => `- ${name}: ${version}`)
      .join('\n');
  }

  private async getRecentChanges(): Promise<string> {
    const changes = await this.mcpClient.callTool('get_git_changes', { days: 7 });
    return changes.map((change: any) => `- ${change.file}: ${change.message}`).join('\n');
  }
}
```

### **2. Database-Aware Prompts**

```typescript
// src/lib/database-aware-prompts.ts
export class DatabaseAwarePrompting {
  constructor(private mcpClient: MCPClient) {}

  async generateDatabaseContextPrompt(request: string): Promise<string> {
    const schema = await this.getDatabaseSchema();
    const sampleData = await this.getSampleData();
    const constraints = await this.getDatabaseConstraints();

    return `
# Database Context
## Schema
${schema}

## Sample Data
${sampleData}

## Constraints
${constraints}

# User Request
${request}

# Instructions
Please consider the database schema, sample data, and constraints when providing your solution. Ensure data integrity and optimal query performance.
    `.trim();
  }

  private async getDatabaseSchema(): Promise<string> {
    const tables = await this.mcpClient.callTool('list_tables', {});
    const schemaPromises = tables.map(async (table: string) => {
      const columns = await this.mcpClient.callTool('get_table_schema', { table });
      return `### ${table}\n${columns.map((col: any) => `- ${col.name}: ${col.type}`).join('\n')}`;
    });
    
    const schemas = await Promise.all(schemaPromises);
    return schemas.join('\n\n');
  }

  private async getSampleData(): Promise<string> {
    const tables = await this.mcpClient.callTool('list_tables', {});
    const samplePromises = tables.map(async (table: string) => {
      const data = await this.mcpClient.callTool('get_sample_data', { table, limit: 3 });
      return `### ${table}\n${JSON.stringify(data, null, 2)}`;
    });
    
    const samples = await Promise.all(samplePromises);
    return samples.join('\n\n');
  }

  private async getDatabaseConstraints(): Promise<string> {
    const constraints = await this.mcpClient.callTool('get_constraints', {});
    return constraints.map((constraint: any) => 
      `- ${constraint.table}.${constraint.column}: ${constraint.type}`
    ).join('\n');
  }
}
```

## 🎯 **Specialized Prompting Techniques**

### **1. Code Generation Prompts**

```typescript
// src/lib/code-generation-prompts.ts
export class CodeGenerationPrompting {
  static generateFunctionPrompt(requirements: any): string {
    return `
# Function Requirements
- Name: ${requirements.name}
- Purpose: ${requirements.purpose}
- Parameters: ${JSON.stringify(requirements.parameters)}
- Return Type: ${requirements.returnType}
- Constraints: ${requirements.constraints}

# Instructions
Please generate a function that meets these requirements:

1. Follow TypeScript best practices
2. Include proper error handling
3. Add JSDoc documentation
4. Include unit tests
5. Consider edge cases
6. Optimize for performance

## Implementation
    `.trim();
  }

  static generateComponentPrompt(requirements: any): string {
    return `
# React Component Requirements
- Name: ${requirements.name}
- Purpose: ${requirements.purpose}
- Props: ${JSON.stringify(requirements.props)}
- State: ${JSON.stringify(requirements.state)}
- Styling: ${requirements.styling}

# Instructions
Please generate a React component that meets these requirements:

1. Use functional components with hooks
2. Follow React best practices
3. Include proper TypeScript types
4. Add proper error boundaries
5. Include accessibility features
6. Optimize for performance

## Implementation
    `.trim();
  }
}
```

### **2. Debugging Prompts**

```typescript
// src/lib/debugging-prompts.ts
export class DebuggingPrompting {
  static generateDebugPrompt(error: any, context: any): string {
    return `
# Error Information
- Message: ${error.message}
- Stack Trace: ${error.stack}
- Type: ${error.type}
- Location: ${error.location}

# Context
- File: ${context.file}
- Function: ${context.function}
- Line: ${context.line}
- Variables: ${JSON.stringify(context.variables)}

# Instructions
Please help debug this error:

1. Analyze the error message and stack trace
2. Identify the root cause
3. Suggest potential fixes
4. Provide a corrected version of the code
5. Explain the fix and why it works

## Analysis
    `.trim();
  }
}
```

## 📈 **Performance Optimization**

### **1. Prompt Caching**

```typescript
// src/lib/prompt-caching.ts
export class PromptCaching {
  private cache = new Map<string, string>();
  private ttl = 300000; // 5 minutes

  async getCachedPrompt(key: string, generator: () => Promise<string>): Promise<string> {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const prompt = await generator();
    this.cache.set(key, prompt);
    
    // Auto-cleanup
    setTimeout(() => {
      this.cache.delete(key);
    }, this.ttl);

    return prompt;
  }

  generateCacheKey(context: any): string {
    return crypto.createHash('md5')
      .update(JSON.stringify(context))
      .digest('hex');
  }
}
```

### **2. Prompt Optimization**

```typescript
// src/lib/prompt-optimization.ts
export class PromptOptimization {
  static optimizePrompt(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .trim();
  }

  static compressContext(context: any): any {
    // Remove unnecessary fields and compress large objects
    const compressed = { ...context };
    
    if (compressed.files && compressed.files.length > 10) {
      compressed.files = compressed.files.slice(0, 10);
      compressed.filesSummary = `... and ${compressed.files.length - 10} more files`;
    }

    return compressed;
  }
}
```

## 🔄 **Continuous Improvement**

### **1. Prompt A/B Testing**

```typescript
// src/lib/prompt-ab-testing.ts
export class PromptABTesting {
  private variants: Map<string, string> = new Map();
  private results: Map<string, any[]> = new Map();

  addVariant(name: string, prompt: string) {
    this.variants.set(name, prompt);
    this.results.set(name, []);
  }

  async testVariant(name: string, testCase: any): Promise<any> {
    const prompt = this.variants.get(name);
    if (!prompt) throw new Error(`Variant ${name} not found`);

    const startTime = Date.now();
    const result = await this.executePrompt(prompt, testCase);
    const responseTime = Date.now() - startTime;

    this.results.get(name)?.push({
      testCase,
      result,
      responseTime,
      timestamp: new Date()
    });

    return result;
  }

  getBestVariant(): string {
    let bestVariant = '';
    let bestScore = 0;

    for (const [name, results] of this.results) {
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const successRate = results.filter(r => r.result.success).length / results.length;
      const score = successRate / avgResponseTime;

      if (score > bestScore) {
        bestScore = score;
        bestVariant = name;
      }
    }

    return bestVariant;
  }

  private async executePrompt(prompt: string, testCase: any): Promise<any> {
    // Implementation depends on your Morph LLM integration
    return { success: true, result: 'test result' };
  }
}
```

---

**Volgende Stappen**: Lees [tool-integration.md](./tool-integration.md) voor externe tools integratie.
