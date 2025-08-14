import { openai } from "@ai-sdk/openai";

/**
 * 🚀 Advanced AI Models Configuration for Full Stack Development
 * 
 * This configuration provides a comprehensive set of OpenAI models optimized for
 * different development tasks, with intelligent fallback strategies and
 * performance optimization.
 * 
 * DEPLOYMENT FIX: This comment ensures fresh Server Action hashes are generated
 * to resolve the "Failed to find Server Action" error in production.
 */

// Base OpenAI configuration
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
};

/**
 * 🎯 Model Definitions for Different Development Tasks
 */

// Primary Models - Latest and Most Capable
export const GPT_5 = openai("gpt-5", OPENAI_CONFIG);
export const GPT_5_MINI = openai("gpt-5-mini", OPENAI_CONFIG);
export const GPT_5_NANO = openai("gpt-5-nano", OPENAI_CONFIG);
export const GPT_4_1 = openai("gpt-4.1", OPENAI_CONFIG);

// Fallback Models - Reliable and Fast
export const GPT_4O = openai("gpt-4o", OPENAI_CONFIG);
export const GPT_4O_MINI = openai("gpt-4o-mini", OPENAI_CONFIG);

// Legacy Models - For Compatibility
export const GPT_4_TURBO = openai("gpt-4-turbo", OPENAI_CONFIG);
export const GPT_3_5_TURBO = openai("gpt-3.5-turbo", OPENAI_CONFIG);

/**
 * 🎯 Model Selection Strategy for Development Tasks
 */

export interface ModelConfig {
  primary: any;
  fallback: any;
  legacy: any;
  maxTokens: number;
  temperature: number;
  description: string;
}

export const MODEL_STRATEGIES = {
  // 🏗️ Architecture & System Design
  ARCHITECTURE: {
    primary: GPT_5,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 32000,
    temperature: 0.1,
    description: "For system architecture, database design, and complex technical decisions"
  },

  // 💻 Code Generation & Refactoring
  CODE_GENERATION: {
    primary: GPT_5_MINI,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 16000,
    temperature: 0.2,
    description: "For generating production-ready code, refactoring, and code optimization"
  },

  // 🔧 Debugging & Problem Solving
  DEBUGGING: {
    primary: GPT_5,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 8000,
    temperature: 0.1,
    description: "For debugging complex issues, error analysis, and troubleshooting"
  },

  // 🎨 UI/UX Design & Frontend
  UI_UX: {
    primary: GPT_5_MINI,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 12000,
    temperature: 0.3,
    description: "For UI/UX design, component creation, and frontend development"
  },

  // 🗄️ Database & Backend
  BACKEND: {
    primary: GPT_5_MINI,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 16000,
    temperature: 0.1,
    description: "For backend development, API design, and database operations"
  },

  // 🔒 Security & Authentication
  SECURITY: {
    primary: GPT_5,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 8000,
    temperature: 0.1,
    description: "For security implementation, authentication, and best practices"
  },

  // 🚀 Performance & Optimization
  PERFORMANCE: {
    primary: GPT_5,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 12000,
    temperature: 0.1,
    description: "For performance optimization, caching strategies, and scalability"
  },

  // 🧪 Testing & Quality Assurance
  TESTING: {
    primary: GPT_5_MINI,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 16000,
    temperature: 0.2,
    description: "For test generation, quality assurance, and automated testing"
  },

  // 📚 Documentation & Learning
  DOCUMENTATION: {
    primary: GPT_5_MINI,
    fallback: GPT_4_1,
    legacy: GPT_4O,
    maxTokens: 12000,
    temperature: 0.3,
    description: "For documentation, tutorials, and educational content"
  },

  // ⚡ Quick Tasks & Simple Operations
  QUICK_TASKS: {
    primary: GPT_5_NANO,
    fallback: GPT_4O_MINI,
    legacy: GPT_3_5_TURBO,
    maxTokens: 4000,
    temperature: 0.2,
    description: "For quick tasks, simple code snippets, and fast responses"
  }
} as const;

/**
 * 🧠 Intelligent Model Selection
 */

export class ModelSelector {
  private static instance: ModelSelector;
  private modelAvailability: Map<string, boolean> = new Map();

  static getInstance(): ModelSelector {
    if (!ModelSelector.instance) {
      ModelSelector.instance = new ModelSelector();
    }
    return ModelSelector.instance;
  }

  /**
   * Select the best model for a given task
   */
  async selectModel(taskType: keyof typeof MODEL_STRATEGIES): Promise<ModelConfig> {
    const strategy = MODEL_STRATEGIES[taskType];
    
    // Try primary model first
    if (await this.isModelAvailable(strategy.primary)) {
      return strategy;
    }
    
    // Fallback to secondary model
    if (await this.isModelAvailable(strategy.fallback)) {
      return {
        ...strategy,
        primary: strategy.fallback,
        fallback: strategy.legacy
      };
    }
    
    // Use legacy model as last resort
    return {
      ...strategy,
      primary: strategy.legacy,
      fallback: strategy.legacy
    };
  }

  /**
   * Check if a model is available (basic availability check)
   */
  private async isModelAvailable(model: any): Promise<boolean> {
    const modelId = this.getModelId(model);
    
    if (this.modelAvailability.has(modelId)) {
      return this.modelAvailability.get(modelId)!;
    }

    // For now, assume all models are available
    // In production, you could implement actual availability checking
    this.modelAvailability.set(modelId, true);
    return true;
  }

  /**
   * Get model ID from model object
   */
  private getModelId(model: any): string {
    // Extract model ID from the model configuration
    return model?.modelId || 'unknown';
  }

  /**
   * Get model for specific development task
   */
  async getModelForTask(task: string): Promise<ModelConfig> {
    // Map common tasks to model strategies
    const taskMapping: Record<string, keyof typeof MODEL_STRATEGIES> = {
      'architecture': 'ARCHITECTURE',
      'system-design': 'ARCHITECTURE',
      'database-design': 'ARCHITECTURE',
      
      'code-generation': 'CODE_GENERATION',
      'refactoring': 'CODE_GENERATION',
      'optimization': 'CODE_GENERATION',
      
      'debugging': 'DEBUGGING',
      'troubleshooting': 'DEBUGGING',
      'error-analysis': 'DEBUGGING',
      
      'ui-design': 'UI_UX',
      'frontend': 'UI_UX',
      'component': 'UI_UX',
      
      'backend': 'BACKEND',
      'api': 'BACKEND',
      'database': 'BACKEND',
      
      'security': 'SECURITY',
      'authentication': 'SECURITY',
      'authorization': 'SECURITY',
      
      'performance': 'PERFORMANCE',
      'optimization': 'PERFORMANCE',
      'scaling': 'PERFORMANCE',
      
      'testing': 'TESTING',
      'qa': 'TESTING',
      'test-generation': 'TESTING',
      
      'documentation': 'DOCUMENTATION',
      'tutorial': 'DOCUMENTATION',
      'learning': 'DOCUMENTATION',
      
      'quick': 'QUICK_TASKS',
      'simple': 'QUICK_TASKS',
      'snippet': 'QUICK_TASKS'
    };

    const taskType = taskMapping[task.toLowerCase()] || 'CODE_GENERATION';
    return this.selectModel(taskType);
  }
}

/**
 * 🎯 Quick Access Functions
 */

export const getModelForTask = (task: string) => ModelSelector.getInstance().getModelForTask(task);

export const getArchitectureModel = () => MODEL_STRATEGIES.ARCHITECTURE.primary;
export const getCodeGenerationModel = () => MODEL_STRATEGIES.CODE_GENERATION.primary;
export const getDebuggingModel = () => MODEL_STRATEGIES.DEBUGGING.primary;
export const getUIModel = () => MODEL_STRATEGIES.UI_UX.primary;
export const getBackendModel = () => MODEL_STRATEGIES.BACKEND.primary;
export const getSecurityModel = () => MODEL_STRATEGIES.SECURITY.primary;
export const getPerformanceModel = () => MODEL_STRATEGIES.PERFORMANCE.primary;
export const getTestingModel = () => MODEL_STRATEGIES.TESTING.primary;
export const getDocumentationModel = () => MODEL_STRATEGIES.DOCUMENTATION.primary;
export const getQuickTaskModel = () => MODEL_STRATEGIES.QUICK_TASKS.primary;

/**
 * 📊 Model Performance Metrics
 */

export interface ModelMetrics {
  responseTime: number;
  tokenUsage: number;
  successRate: number;
  cost: number;
}

export class ModelPerformanceTracker {
  private metrics: Map<string, ModelMetrics[]> = new Map();

  recordMetrics(modelId: string, metrics: ModelMetrics) {
    if (!this.metrics.has(modelId)) {
      this.metrics.set(modelId, []);
    }
    this.metrics.get(modelId)!.push(metrics);
  }

  getAverageMetrics(modelId: string): ModelMetrics | null {
    const modelMetrics = this.metrics.get(modelId);
    if (!modelMetrics || modelMetrics.length === 0) {
      return null;
    }

    const avg = modelMetrics.reduce((acc, curr) => ({
      responseTime: acc.responseTime + curr.responseTime,
      tokenUsage: acc.tokenUsage + curr.tokenUsage,
      successRate: acc.successRate + curr.successRate,
      cost: acc.cost + curr.cost
    }), { responseTime: 0, tokenUsage: 0, successRate: 0, cost: 0 });

    const count = modelMetrics.length;
    return {
      responseTime: avg.responseTime / count,
      tokenUsage: avg.tokenUsage / count,
      successRate: avg.successRate / count,
      cost: avg.cost / count
    };
  }
}

// Export singleton instance
export const performanceTracker = new ModelPerformanceTracker();
