import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import OpenAI from "openai";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";
import crypto from "crypto";
import { morphTool as baseMorphTool } from "./morph-tool";

const openai = new OpenAI({
  apiKey: process.env.MORPH_API_KEY,
  baseURL: "https://api.morphllm.com/v1",
});

// Intelligent caching system
const fileCache = new Map<string, {
  content: string;
  timestamp: number;
  hash: string;
}>();

const CACHE_TTL = parseInt(process.env.MORPH_CACHE_TTL || '300000'); // 5 minutes

// Performance metrics tracking
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

// Cache management functions
async function getCachedFile(fs: any, target_file: string): Promise<{ content: string; cacheHit: boolean }> {
  const cached = fileCache.get(target_file);
  const currentHash = await calculateFileHash(fs, target_file);
  
  if (cached && cached.hash === currentHash && Date.now() - cached.timestamp < CACHE_TTL) {
    return { content: cached.content, cacheHit: true };
  }
  
  const content = await fs.readFile(target_file);
  fileCache.set(target_file, {
    content,
    timestamp: Date.now(),
    hash: currentHash
  });
  
  return { content, cacheHit: false };
}

async function calculateFileHash(fs: any, target_file: string): Promise<string> {
  const content = await fs.readFile(target_file);
  return crypto.createHash('md5').update(content).digest('hex');
}

// Content optimization
function optimizeContent(file: string, code_edit: string, instructions: string): string {
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

// Priority-based processing
function getPriorityConfig(priority: "low" | "medium" | "high") {
  switch (priority) {
    case "high":
      return {
        maxTokens: 8000,
        temperature: 0.1,
        timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_HIGH || '30000')
      };
    case "medium":
      return {
        maxTokens: 4000,
        temperature: 0.2,
        timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_MEDIUM || '15000')
      };
    case "low":
      return {
        maxTokens: 2000,
        temperature: 0.3,
        timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_LOW || '10000')
      };
  }
}

// Retry logic with exponential backoff
async function callMorphWithRetry(content: string, priority: "low" | "medium" | "high", maxRetries = 3): Promise<any> {
  const config = getPriorityConfig(priority);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({
        model: "morph-v3-large",
        messages: [{ role: "user", content }],
        max_tokens: config.maxTokens,
        temperature: config.temperature
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

// Core Fast Apply function
async function fastApplyEdit(
  fs: FreestyleDevServerFilesystem,
  target_file: string,
  instructions: string,
  code_edit: string,
  priority: "low" | "medium" | "high" = "medium"
) {
  const metrics = FastApplyMetrics.getInstance();
  const startTime = Date.now();
  
  try {
    // 1. Optimized file reading with caching
    const { content: file, cacheHit } = await getCachedFile(fs, target_file);
    
    // 2. Content optimization
    const optimizedContent = optimizeContent(file, code_edit, instructions);
    
    // 3. Priority-based API call with retry
    const response = await callMorphWithRetry(optimizedContent, priority);
    
    // 4. Validation and application
    const finalCode = response.choices[0]?.message?.content;
    
    if (!finalCode) {
      throw new Error("No code returned from Morph API.");
    }
    
    // 5. Safe write with backup
    await safeWriteFile(fs, target_file, finalCode);
    
    const responseTime = Date.now() - startTime;
    metrics.trackCall(true, responseTime, cacheHit);
    
    console.log(`Fast apply successful: ${target_file} (${responseTime}ms, cache: ${cacheHit ? 'hit' : 'miss'})`);
    
    return { success: true, file: target_file, responseTime, cacheHit };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    metrics.trackCall(false, responseTime, false);
    
    console.error(`Fast apply failed: ${target_file} (${responseTime}ms)`, error);
    throw error;
  }
}

// Safe write with backup
async function safeWriteFile(fs: any, target_file: string, newContent: string) {
  const backup = await fs.readFile(target_file);
  const backupPath = `${target_file}.backup.${Date.now()}`;
  
  try {
    await fs.writeFile(backupPath, backup);
    await fs.writeFile(target_file, newContent);
    console.log(`Backup created: ${backupPath}`);
  } catch (error) {
    console.error('Error applying changes, restoring backup...');
    await fs.writeFile(target_file, backup);
    throw error;
  }
}

// Basic Morph Tool (re-export from morph-tool.ts)
export const morphTool = baseMorphTool;

// Main Fast Apply Tool
export const fastApplyTool = (fs: FreestyleDevServerFilesystem) =>
  createTool({
    id: "fast_edit_file",
    description: "Fast apply code edits using Morph LLM with optimized performance, caching, and priority-based processing",
    inputSchema: z.object({
      target_file: z.string().describe("The target file to modify"),
      instructions: z.string().describe("Clear instruction for the edit"),
      code_edit: z.string().describe("Code changes with markers"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Edit priority (default: medium)"),
    }),
    execute: async ({ context: { target_file, instructions, code_edit, priority }, runtimeContext }) => {
      return await fastApplyEdit(fs, target_file, instructions, code_edit, priority || "medium");
    }
  });

// Batch Edit Tool
export const batchEditTool = (fs: FreestyleDevServerFilesystem) =>
  createTool({
    id: "batch_edit_files",
    description: "Edit multiple files in a single operation with parallel processing",
    inputSchema: z.object({
      edits: z.array(z.object({
        target_file: z.string(),
        instructions: z.string(),
        code_edit: z.string(),
        priority: z.enum(["low", "medium", "high"]).optional()
      })).describe("Array of file edits to apply"),
    }),
    execute: async ({ context: { edits }, runtimeContext }) => {
      return await batchApplyEdits(fs, edits);
    }
  });

// Batch processing function
async function batchApplyEdits(fs: any, edits: Array<{
  target_file: string;
  instructions: string;
  code_edit: string;
  priority?: "low" | "medium" | "high";
}>) {
  const startTime = Date.now();
  
  // Process edits in parallel for better performance
  const promises = edits.map(async (edit) => {
    try {
      const result = await fastApplyEdit(
        fs,
        edit.target_file,
        edit.instructions,
        edit.code_edit,
        edit.priority || "medium"
      );
      return { ...result, file: edit.target_file };
    } catch (error) {
      return { 
        success: false, 
        file: edit.target_file, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  
  const batchResults = await Promise.allSettled(promises);
  const totalTime = Date.now() - startTime;
  
  const successful = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = batchResults.filter(r => r.status === 'rejected' || !r.value.success).length;
  
  console.log(`Batch edit completed: ${successful}/${edits.length} successful (${totalTime}ms)`);
  
  return {
    total: edits.length,
    successful,
    failed,
    totalTime,
    results: batchResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
  };
}

// Metrics tool for monitoring
export const morphMetricsTool = () =>
  createTool({
    id: "get_morph_metrics",
    description: "Get performance metrics for Morph Fast Apply operations",
    inputSchema: z.object({}),
    execute: async ({ runtimeContext }) => {
      const metrics = FastApplyMetrics.getInstance();
      return metrics.getMetrics();
    }
  });

// Cache cleanup function
export function cleanupCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of fileCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      fileCache.delete(key);
      cleaned++;
    }
  }
  
  console.log(`Cache cleanup: removed ${cleaned} expired entries`);
  return cleaned;
}

// Auto-cleanup every 5 minutes
setInterval(cleanupCache, CACHE_TTL);

// Export metrics for external monitoring
export { FastApplyMetrics };
