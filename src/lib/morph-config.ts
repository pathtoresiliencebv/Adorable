// Morph LLM Integration Configuration
export const morphConfig = {
  // API Configuration
  api: {
    baseURL: "https://api.morphllm.com/v1",
    model: "morph-v3-large",
    timeout: parseInt(process.env.MORPH_API_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.MORPH_MAX_RETRIES || '3'),
  },

  // Fast Apply Configuration
  fastApply: {
    enabled: process.env.MORPH_FAST_APPLY_ENABLED === 'true',
    cache: {
      ttl: parseInt(process.env.MORPH_CACHE_TTL || '300000'), // 5 minutes
      maxSize: parseInt(process.env.MORPH_CACHE_MAX_SIZE || '100'),
    },
    retry: {
      maxAttempts: parseInt(process.env.MORPH_MAX_RETRIES || '3'),
      backoffMultiplier: 2,
    },
    batch: {
      maxSize: parseInt(process.env.MORPH_BATCH_SIZE || '5'),
      parallel: true,
    },
    priority: {
      high: {
        timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_HIGH || '30000'),
        maxTokens: 8000,
        temperature: 0.1,
      },
      medium: {
        timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_MEDIUM || '15000'),
        maxTokens: 4000,
        temperature: 0.2,
      },
      low: {
        timeout: parseInt(process.env.MORPH_PRIORITY_TIMEOUT_LOW || '10000'),
        maxTokens: 2000,
        temperature: 0.3,
      },
    },
  },

  // Debug Configuration
  debug: {
    enabled: process.env.MORPH_DEBUG === 'true',
    dryRun: process.env.MORPH_DRY_RUN === 'true',
    logLevel: process.env.MORPH_LOG_LEVEL || 'info',
  },

  // Performance Configuration
  performance: {
    enableMetrics: process.env.MORPH_ENABLE_METRICS !== 'false',
    enableCaching: process.env.MORPH_ENABLE_CACHING !== 'false',
    enableBackup: process.env.MORPH_ENABLE_BACKUP !== 'false',
  },

  // Validation Configuration
  validation: {
    maxFileSize: parseInt(process.env.MORPH_MAX_FILE_SIZE || '100000'), // 100KB
    maxInstructionLength: parseInt(process.env.MORPH_MAX_INSTRUCTION_LENGTH || '1000'),
    requireCodeMarkers: process.env.MORPH_REQUIRE_CODE_MARKERS !== 'false',
  },
};

// Environment variable validation
export function validateMorphConfig() {
  const requiredVars = ['MORPH_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing required Morph environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

// Configuration helpers
export function isMorphEnabled(): boolean {
  return !!process.env.MORPH_API_KEY && validateMorphConfig();
}

export function getMorphPriority(priority?: string): "low" | "medium" | "high" {
  if (priority && ["low", "medium", "high"].includes(priority)) {
    return priority as "low" | "medium" | "high";
  }
  return "medium";
}

export function shouldUseFastApply(): boolean {
  return morphConfig.fastApply.enabled && isMorphEnabled();
}

// Performance monitoring configuration
export const performanceConfig = {
  metrics: {
    enabled: morphConfig.performance.enableMetrics,
    retention: parseInt(process.env.MORPH_METRICS_RETENTION || '86400000'), // 24 hours
    flushInterval: parseInt(process.env.MORPH_METRICS_FLUSH_INTERVAL || '60000'), // 1 minute
  },
  logging: {
    enabled: morphConfig.debug.enabled,
    level: morphConfig.debug.logLevel,
    format: process.env.MORPH_LOG_FORMAT || 'json',
  },
};

// Export default configuration
export default morphConfig;
