import { SYSTEM_MESSAGE } from "@/lib/system";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { todoTool } from "@/tools/todo-tool";
import { 
  getModelForTask, 
  MODEL_STRATEGIES, 
  getCodeGenerationModel,
  getArchitectureModel,
  getDebuggingModel,
  getSecurityModel,
  getPerformanceModel,
  performanceTracker
} from "@/lib/ai-models";

// Enhanced memory configuration with better connection handling
export const memory = new Memory({
  options: {
    lastMessages: 1000,
    semanticRecall: false, // Disabled until embedder is configured
    threads: {
      generateTitle: true,
    },
  },
  vector: new PgVector({
    connectionString: process.env.DATABASE_URL!,
    // Add connection timeout and retry configuration
    connection: {
      connectionTimeoutMillis: 10000, // 10 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      max: 20, // Maximum number of connections
      min: 2, // Minimum number of connections
    },
  }),
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
    // Add connection timeout and retry configuration
    connection: {
      connectionTimeoutMillis: 10000, // 10 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      max: 20, // Maximum number of connections
      min: 2, // Minimum number of connections
    },
  }),
  processors: [],
});

/**
 * 🚀 Fallback memory configuration for when database is not available
 */
export const createFallbackMemory = () => {
  console.warn("Using fallback memory configuration - database connection failed");
  return new Memory({
    options: {
      lastMessages: 100, // Reduced for fallback
      semanticRecall: false,
      threads: {
        generateTitle: false, // Disabled for fallback
      },
    },
    // No vector or storage for fallback - in-memory only
    processors: [],
  });
};

/**
 * 🚀 Advanced Builder Agent with Intelligent Model Selection
 * 
 * This agent automatically selects the best AI model based on the task type,
 * providing optimal performance for different development scenarios.
 */

// Primary builder agent with GPT-5 for code generation
export const builderAgent = new Agent({
  name: "BuilderAgent",
  model: getCodeGenerationModel(),
  instructions: SYSTEM_MESSAGE,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

/**
 * 🎯 Specialized Agents for Different Development Tasks
 */

// Architecture & System Design Agent
export const architectureAgent = new Agent({
  name: "ArchitectureAgent",
  model: getArchitectureModel(),
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: System Architecture & Design
- Focus on scalable, maintainable system design
- Consider performance, security, and cost implications
- Provide detailed architectural diagrams and explanations
- Recommend best practices for the specific technology stack`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Debugging & Problem Solving Agent
export const debuggingAgent = new Agent({
  name: "DebuggingAgent",
  model: getDebuggingModel(),
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Debugging & Problem Solving
- Analyze error messages and stack traces systematically
- Identify root causes of issues
- Provide step-by-step debugging strategies
- Suggest preventive measures to avoid similar issues`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// UI/UX Design Agent
export const uiUxAgent = new Agent({
  name: "UIUXAgent",
  model: MODEL_STRATEGIES.UI_UX.primary,
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: UI/UX Design & Frontend Development
- Create intuitive, accessible user interfaces
- Follow modern design principles and patterns
- Implement responsive and mobile-first designs
- Focus on user experience and interaction design`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Backend Development Agent
export const backendAgent = new Agent({
  name: "BackendAgent",
  model: MODEL_STRATEGIES.BACKEND.primary,
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Backend Development & API Design
- Design robust, scalable APIs and database schemas
- Implement proper error handling and validation
- Consider security, performance, and maintainability
- Follow RESTful or GraphQL best practices`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Security Agent
export const securityAgent = new Agent({
  name: "SecurityAgent",
  model: getSecurityModel(),
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Security & Authentication
- Implement secure authentication and authorization
- Follow security best practices and OWASP guidelines
- Protect against common vulnerabilities
- Ensure data privacy and compliance`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Performance Optimization Agent
export const performanceAgent = new Agent({
  name: "PerformanceAgent",
  model: getPerformanceModel(),
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Performance & Optimization
- Analyze and optimize application performance
- Implement caching strategies and database optimization
- Provide scalability recommendations
- Monitor and improve resource usage`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Testing & QA Agent
export const testingAgent = new Agent({
  name: "TestingAgent",
  model: MODEL_STRATEGIES.TESTING.primary,
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Testing & Quality Assurance
- Create comprehensive test suites
- Implement automated testing strategies
- Ensure code quality and reliability
- Follow testing best practices and methodologies`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Documentation Agent
export const documentationAgent = new Agent({
  name: "DocumentationAgent",
  model: MODEL_STRATEGIES.DOCUMENTATION.primary,
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Documentation & Learning
- Create clear, comprehensive documentation
- Write tutorials and learning materials
- Explain complex concepts in simple terms
- Provide code examples and best practices`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

// Quick Task Agent
export const quickTaskAgent = new Agent({
  name: "QuickTaskAgent",
  model: MODEL_STRATEGIES.QUICK_TASKS.primary,
  instructions: `${SYSTEM_MESSAGE}

SPECIALIZATION: Quick Tasks & Simple Operations
- Handle simple, straightforward tasks efficiently
- Provide fast, accurate responses
- Focus on practical solutions
- Minimize complexity for simple operations`,
  memory,
  tools: {
    update_todo_list: todoTool,
  },
});

/**
 * 🧠 Intelligent Agent Factory
 */

export class AgentFactory {
  private static agents: Map<string, Agent> = new Map();

  /**
   * Get the best agent for a specific task
   */
  static async getAgentForTask(task: string): Promise<Agent> {
    const taskLower = task.toLowerCase();
    
    // Map tasks to specialized agents
    if (taskLower.includes('architecture') || taskLower.includes('system-design') || taskLower.includes('database-design')) {
      return this.getOrCreateAgent('architecture', architectureAgent);
    }
    
    if (taskLower.includes('debug') || taskLower.includes('error') || taskLower.includes('troubleshoot')) {
      return this.getOrCreateAgent('debugging', debuggingAgent);
    }
    
    if (taskLower.includes('ui') || taskLower.includes('frontend') || taskLower.includes('component') || taskLower.includes('design')) {
      return this.getOrCreateAgent('ui-ux', uiUxAgent);
    }
    
    if (taskLower.includes('backend') || taskLower.includes('api') || taskLower.includes('database')) {
      return this.getOrCreateAgent('backend', backendAgent);
    }
    
    if (taskLower.includes('security') || taskLower.includes('auth') || taskLower.includes('secure')) {
      return this.getOrCreateAgent('security', securityAgent);
    }
    
    if (taskLower.includes('performance') || taskLower.includes('optimize') || taskLower.includes('scale')) {
      return this.getOrCreateAgent('performance', performanceAgent);
    }
    
    if (taskLower.includes('test') || taskLower.includes('qa') || taskLower.includes('quality')) {
      return this.getOrCreateAgent('testing', testingAgent);
    }
    
    if (taskLower.includes('document') || taskLower.includes('tutorial') || taskLower.includes('learn')) {
      return this.getOrCreateAgent('documentation', documentationAgent);
    }
    
    if (taskLower.includes('quick') || taskLower.includes('simple') || taskLower.includes('snippet')) {
      return this.getOrCreateAgent('quick-task', quickTaskAgent);
    }
    
    // Default to builder agent for general tasks
    return this.getOrCreateAgent('builder', builderAgent);
  }

  private static getOrCreateAgent(name: string, agent: Agent): Agent {
    if (!this.agents.has(name)) {
      this.agents.set(name, agent);
    }
    return this.agents.get(name)!;
  }

  /**
   * Get all available agents
   */
  static getAllAgents(): Record<string, Agent> {
    return {
      builder: builderAgent,
      architecture: architectureAgent,
      debugging: debuggingAgent,
      uiUx: uiUxAgent,
      backend: backendAgent,
      security: securityAgent,
      performance: performanceAgent,
      testing: testingAgent,
      documentation: documentationAgent,
      quickTask: quickTaskAgent,
    };
  }

  /**
   * Get agent statistics
   */
  static getAgentStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, agent] of Object.entries(this.getAllAgents())) {
      stats[name] = {
        modelId: agent.model?.modelId || 'unknown',
        name: agent.name,
        metrics: performanceTracker.getAverageMetrics(agent.model?.modelId || 'unknown'),
      };
    }
    
    return stats;
  }
}

/**
 * 🎯 Enhanced agent creation with error handling
 */
export const createBuilderAgent = () => {
  try {
    return new Agent({
      name: "BuilderAgent",
      model: getCodeGenerationModel(),
      instructions: SYSTEM_MESSAGE,
      memory,
      tools: {
        update_todo_list: todoTool,
      },
    });
  } catch (error) {
    console.error("Error creating builder agent:", error);
    throw new Error("Failed to create builder agent. Check your OpenAI API key and configuration.");
  }
};

/**
 * 🚀 Export a function to get the agent with proper error handling
 */
export const getBuilderAgent = () => {
  try {
    return builderAgent;
  } catch (error) {
    console.error("Error getting builder agent:", error);
    return createBuilderAgent();
  }
};
