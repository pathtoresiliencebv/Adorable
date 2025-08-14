# Morph Fast Apply Functionaliteit

## Wat is Fast Apply?

Fast Apply is een geoptimaliseerde versie van de Morph LLM code editing die is ontworpen voor snellere en meer efficiënte code wijzigingen. Het maakt gebruik van geavanceerde technieken om code edits sneller en accurater toe te passen.

## Voordelen van Fast Apply

1. **Snellere Response Tijden**: Geoptimaliseerde API calls voor betere performance
2. **Betere Accuraatheid**: Verbeterde context begrip voor precisie edits
3. **Minder Retries**: Hogere success rate door betere error handling
4. **Batch Processing**: Mogelijkheid om meerdere edits tegelijk te verwerken

## Implementatie

### Basis Fast Apply Tool

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import OpenAI from "openai";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";

const openai = new OpenAI({
  apiKey: process.env.MORPH_API_KEY,
  baseURL: "https://api.morphllm.com/v1",
});

export const fastApplyTool = (fs: FreestyleDevServerFilesystem) =>
  createTool({
    id: "fast_edit_file",
    description: "Fast apply code edits using Morph LLM with optimized performance",
    inputSchema: z.object({
      target_file: z.string().describe("The target file to modify"),
      instructions: z.string().describe("Clear instruction for the edit"),
      code_edit: z.string().describe("Code changes with markers"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Edit priority"),
    }),
    execute: async ({ context: { target_file, instructions, code_edit, priority } }) => {
      return await fastApplyEdit(fs, target_file, instructions, code_edit, priority);
    }
  });
```

### Fast Apply Core Function

```typescript
async function fastApplyEdit(
  fs: FreestyleDevServerFilesystem,
  target_file: string,
  instructions: string,
  code_edit: string,
  priority: "low" | "medium" | "high" = "medium"
) {
  // 1. Optimized file reading with caching
  const file = await getCachedFile(fs, target_file);
  
  // 2. Content optimization
  const optimizedContent = optimizeContent(file, code_edit);
  
  // 3. Priority-based API call
  const response = await callMorphWithPriority(
    instructions,
    optimizedContent,
    priority
  );
  
  // 4. Validation and application
  const finalCode = validateAndCleanCode(response);
  await safeWriteFile(fs, target_file, finalCode);
  
  return { success: true, file: target_file };
}
```

## Performance Optimalisaties

### 1. Intelligent Caching

```typescript
const fileCache = new Map<string, {
  content: string;
  timestamp: number;
  hash: string;
}>();

async function getCachedFile(fs: any, target_file: string): Promise<string> {
  const cached = fileCache.get(target_file);
  const currentHash = await calculateFileHash(fs, target_file);
  
  if (cached && cached.hash === currentHash) {
    return cached.content;
  }
  
  const content = await fs.readFile(target_file);
  fileCache.set(target_file, {
    content,
    timestamp: Date.now(),
    hash: currentHash
  });
  
  return content;
}

async function calculateFileHash(fs: any, target_file: string): Promise<string> {
  const content = await fs.readFile(target_file);
  return require('crypto').createHash('md5').update(content).digest('hex');
}
```

### 2. Content Optimization

```typescript
function optimizeContent(file: string, code_edit: string): string {
  // Remove unnecessary whitespace and comments for faster processing
  const optimizedFile = file
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  const optimizedEdit = code_edit
    .replace(/\s+/g, ' ')
    .trim();
  
  return `<instruction>${instructions}</instruction>\n<code>${optimizedFile}</code>\n<update>${optimizedEdit}</update>`;
}
```

### 3. Priority-Based Processing

```typescript
async function callMorphWithPriority(
  instructions: string,
  content: string,
  priority: "low" | "medium" | "high"
): Promise<any> {
  const config = getPriorityConfig(priority);
  
  return await openai.chat.completions.create({
    model: "morph-v3-large",
    messages: [{ role: "user", content }],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    timeout: config.timeout
  });
}

function getPriorityConfig(priority: "low" | "medium" | "high") {
  switch (priority) {
    case "high":
      return {
        maxTokens: 8000,
        temperature: 0.1,
        timeout: 30000
      };
    case "medium":
      return {
        maxTokens: 4000,
        temperature: 0.2,
        timeout: 15000
      };
    case "low":
      return {
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 10000
      };
  }
}
```

## Batch Processing

### 1. Multiple File Edits

```typescript
export const batchEditTool = (fs: FreestyleDevServerFilesystem) =>
  createTool({
    id: "batch_edit_files",
    description: "Edit multiple files in a single operation",
    inputSchema: z.object({
      edits: z.array(z.object({
        target_file: z.string(),
        instructions: z.string(),
        code_edit: z.string()
      })).describe("Array of file edits to apply"),
    }),
    execute: async ({ context: { edits } }) => {
      return await batchApplyEdits(fs, edits);
    }
  });

async function batchApplyEdits(fs: any, edits: Array<{
  target_file: string;
  instructions: string;
  code_edit: string;
}>) {
  const results = [];
  
  // Process edits in parallel for better performance
  const promises = edits.map(async (edit) => {
    try {
      const result = await fastApplyEdit(
        fs,
        edit.target_file,
        edit.instructions,
        edit.code_edit
      );
      return { ...result, file: edit.target_file };
    } catch (error) {
      return { 
        success: false, 
        file: edit.target_file, 
        error: error.message 
      };
    }
  });
  
  const batchResults = await Promise.allSettled(promises);
  
  return {
    total: edits.length,
    successful: batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length,
    failed: batchResults.filter(r => r.status === 'rejected' || !r.value.success).length,
    results: batchResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
  };
}
```

### 2. Smart Batching

```typescript
function groupEditsByType(edits: Array<any>) {
  const groups = {
    interface: [],
    component: [],
    styling: [],
    logic: [],
    other: []
  };
  
  edits.forEach(edit => {
    if (edit.target_file.includes('.interface.') || edit.target_file.includes('types/')) {
      groups.interface.push(edit);
    } else if (edit.target_file.includes('.component.') || edit.target_file.includes('components/')) {
      groups.component.push(edit);
    } else if (edit.target_file.includes('.css') || edit.target_file.includes('.scss')) {
      groups.styling.push(edit);
    } else if (edit.target_file.includes('.logic.') || edit.target_file.includes('utils/')) {
      groups.logic.push(edit);
    } else {
      groups.other.push(edit);
    }
  });
  
  return groups;
}
```

## Error Recovery

### 1. Automatic Retry with Backoff

```typescript
async function callMorphWithRetry(content: string, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({
        model: "morph-v3-large",
        messages: [{ role: "user", content }]
      });
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (error.status === 500 && i < maxRetries - 1) {
        const delay = 1000 * (i + 1);
        console.log(`Server error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}
```

### 2. Fallback Strategies

```typescript
async function applyEditWithFallback(fs: any, target_file: string, instructions: string, code_edit: string) {
  try {
    // Try fast apply first
    return await fastApplyEdit(fs, target_file, instructions, code_edit);
  } catch (error) {
    console.log('Fast apply failed, trying standard edit...');
    
    try {
      // Fallback to standard edit
      return await standardEdit(fs, target_file, instructions, code_edit);
    } catch (fallbackError) {
      console.log('Standard edit failed, trying manual edit...');
      
      // Final fallback to manual edit
      return await manualEdit(fs, target_file, code_edit);
    }
  }
}
```

## Monitoring en Metrics

### 1. Performance Tracking

```typescript
class FastApplyMetrics {
  private static instance: FastApplyMetrics;
  private metrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  static getInstance(): FastApplyMetrics {
    if (!FastApplyMetrics.instance) {
      FastApplyMetrics.instance = new FastApplyMetrics();
    }
    return FastApplyMetrics.instance;
  }
  
  trackCall(success: boolean, responseTime: number, cacheHit: boolean) {
    this.metrics.totalCalls++;
    
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
    
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalCalls - 1) + responseTime) / this.metrics.totalCalls;
    
    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.successfulCalls / this.metrics.totalCalls,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
    };
  }
}
```

### 2. Real-time Monitoring

```typescript
async function monitoredFastApply(fs: any, target_file: string, instructions: string, code_edit: string) {
  const metrics = FastApplyMetrics.getInstance();
  const startTime = Date.now();
  
  try {
    const result = await fastApplyEdit(fs, target_file, instructions, code_edit);
    const responseTime = Date.now() - startTime;
    
    metrics.trackCall(true, responseTime, false);
    
    console.log(`Fast apply successful: ${target_file} (${responseTime}ms)`);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    metrics.trackCall(false, responseTime, false);
    
    console.error(`Fast apply failed: ${target_file} (${responseTime}ms)`, error);
    throw error;
  }
}
```

## Configuratie

### Environment Variables

```env
# Fast Apply Configuration
MORPH_FAST_APPLY_ENABLED=true
MORPH_CACHE_TTL=300000  # 5 minutes
MORPH_MAX_RETRIES=3
MORPH_BATCH_SIZE=5
MORPH_PRIORITY_TIMEOUT_HIGH=30000
MORPH_PRIORITY_TIMEOUT_MEDIUM=15000
MORPH_PRIORITY_TIMEOUT_LOW=10000
```

### Configuration Object

```typescript
const fastApplyConfig = {
  enabled: process.env.MORPH_FAST_APPLY_ENABLED === 'true',
  cache: {
    ttl: parseInt(process.env.MORPH_CACHE_TTL || '300000'),
    maxSize: 100
  },
  retry: {
    maxAttempts: parseInt(process.env.MORPH_MAX_RETRIES || '3'),
    backoffMultiplier: 2
  },
  batch: {
    maxSize: parseInt(process.env.MORPH_BATCH_SIZE || '5'),
    parallel: true
  },
  priority: {
    high: {
      timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_HIGH || '30000'),
      maxTokens: 8000
    },
    medium: {
      timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_MEDIUM || '15000'),
      maxTokens: 4000
    },
    low: {
      timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_LOW || '10000'),
      maxTokens: 2000
    }
  }
};
```

## Gebruiksvoorbeelden

### 1. Eenvoudige Fast Apply

```typescript
const result = await fastApplyTool(fs).execute({
  context: {
    target_file: "src/components/Button.tsx",
    instructions: "Add disabled prop to Button component",
    code_edit: `
interface ButtonProps {
  disabled?: boolean;
  // ... existing code ...
}
    `,
    priority: "high"
  }
});
```

### 2. Batch Edit

```typescript
const result = await batchEditTool(fs).execute({
  context: {
    edits: [
      {
        target_file: "src/components/Button.tsx",
        instructions: "Add disabled prop",
        code_edit: "interface ButtonProps { disabled?: boolean; // ... existing code ... }"
      },
      {
        target_file: "src/components/Input.tsx",
        instructions: "Add placeholder prop",
        code_edit: "interface InputProps { placeholder?: string; // ... existing code ... }"
      }
    ]
  }
});
```

### 3. Priority-Based Edit

```typescript
// High priority for critical fixes
const criticalFix = await fastApplyTool(fs).execute({
  context: {
    target_file: "src/utils/validation.ts",
    instructions: "Fix critical validation bug",
    code_edit: "// ... existing code ...\nif (value === null) return false;\n// ... existing code ...",
    priority: "high"
  }
});

// Low priority for cosmetic changes
const cosmeticChange = await fastApplyTool(fs).execute({
  context: {
    target_file: "src/styles/theme.css",
    instructions: "Update button border radius",
    code_edit: "// ... existing code ...\nborder-radius: 8px;\n// ... existing code ...",
    priority: "low"
  }
});
```
