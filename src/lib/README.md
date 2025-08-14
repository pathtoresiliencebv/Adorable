# 🚀 AI Builder Library

This library provides a flexible foundation for building AI-powered applications using Mastra agents with Freestyle MCP tools.

## 🎯 Core Concept

The library is designed around **agents** - you can use the pre-configured `builderAgent` or create your own custom agents. All the streaming, durability, and MCP integration features work with any Mastra agent you provide.

## 🚀 Quick Start

### Using the Default Agent

```typescript
import { builderAgent, sendMessageWithStreaming } from "@/lib";

const response = await sendMessageWithStreaming(
  builderAgent,
  appId,
  mcpUrl,
  userMessage
);
```

### Creating Your Own Agent

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { sendMessageWithStreaming } from "@/lib";

// Create your custom agent
const myCustomAgent = new Agent({
  name: "MyCustomAgent",
  model: openai("gpt-4o"),
  instructions: "Your custom instructions here",
  memory: new Memory({
    options: { lastMessages: 1000 },
    vector: new PgVector({ connectionString: process.env.DATABASE_URL! }),
    storage: new PostgresStore({ connectionString: process.env.DATABASE_URL! }),
  }),
  tools: {
    your_custom_tool: yourTool,
  },
});

// Use your custom agent with all the streaming and durability features
const response = await sendMessageWithStreaming(
  myCustomAgent,
  appId,
  mcpUrl,
  userMessage
);
```

## 🛠️ Available Services

### Core Services

- **`sendMessageWithStreaming`** - Main function for AI interactions with streaming
- **`AIService.sendMessage`** - Lower-level AI service for custom implementations
- **`builderAgent`** - Pre-configured agent with todo tool

### Stream Management

- **`getStreamState`** - Check current stream status
- **`isStreamRunning`** - Check if stream is active
- **`stopStream`** - Stop an active stream
- **`waitForStreamToStop`** - Wait for stream to finish stopping
- **`clearStreamState`** - Clear stream state
- **`getStream`** - Get current stream
- **`setStream`** - Set current stream
- **`setupAbortCallback`** - Setup abort callback for stream
- **`updateKeepAlive`** - Update keep alive for stream
- **`handleStreamLifecycle`** - Handle stream lifecycle events

## 🔧 Configuration

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o
- `FREESTYLE_API_KEY` - Freestyle API key for MCP tools

### Memory Configuration

The library uses PostgreSQL for persistent memory storage with vector search capabilities. Make sure your database supports the `pgvector` extension.

## 🚀 Deployment

The library is designed to work with Vercel and other serverless platforms. All streaming and memory features are optimized for serverless environments.

## 📚 Examples

See the `src/app/api/chat/route.ts` file for a complete example of how to use the library in a Next.js API route.

## 🛠️ Available Services

### Core Services

- **`sendMessageWithStreaming`** - Main function for AI interactions with streaming
- **`AIService.sendMessage`** - Lower-level AI service for custom implementations
- **`builderAgent`** - Pre-configured agent with todo tool

### Stream Management

- **`getStreamState`** - Check current stream status
- **`isStreamRunning`** - Check if stream is active
- **`stopStream`** - Stop an active stream
- **`waitForStreamToStop`** - Wait for stream to finish stopping
- **`clearStreamState`** - Clear stream state
- **`getStream`** - Get current stream
- **`setStream`** - Set current stream
- **`setupAbortCallback`** - Setup abort callback for stream
- **`updateKeepAlive`** - Update keep alive for stream
- **`handleStreamLifecycle`** - Handle stream lifecycle events

## 🔧 Advanced Usage

### Custom Tool Integration

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const myCustomTool = createTool({
  id: "my_custom_tool",
  description: "What my tool does",
  inputSchema: z.object({
    input: z.string().describe("Input for the tool"),
  }),
  execute: async ({ input }) => {
    // Your tool logic here
    return { result: `Processed: ${input}` };
  },
});

const myAgent = new Agent({
  // ... other config
  tools: { my_custom_tool: myCustomTool },
});
```

### Direct AIService Usage

```typescript
import { AIService } from "@/lib";

const response = await AIService.sendMessage(myAgent, appId, mcpUrl, message, {
  maxSteps: 50,
  maxOutputTokens: 32000,
  onStepFinish: (step) => console.log("Step finished:", step),
  onFinish: () => console.log("AI finished!"),
});
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Agent    │───▶│  AIService       │───▶│  MCP Client     │
│                 │    │                  │    │                 │
│ - Custom model  │    │ - Streaming      │    │ - Freestyle     │
│ - Custom tools  │    │ - Memory mgmt    │    │ - Git ops       │
│ - Custom memory │    │ - Error handling │    │ - File ops      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Stream Manager  │    │ Redis Streams    │    │ Freestyle MCP   │
│                 │    │                  │    │                 │
│ - Durability    │    │ - Persistence    │    │ - State mgmt     │
│ - Resumability  │    │ - Keep-alive     │    │ - Execution     │
│ - Lifecycle     │    │ - Deployment    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎨 Key Benefits

1. **Flexibility** - Use any Mastra agent you want
2. **Reusability** - All streaming and durability features work with any agent
3. **Simplicity** - Clean, focused API without unnecessary abstractions
4. **Power** - Full access to Freestyle MCP tools and Mastra capabilities
5. **Durability** - Redis-backed streaming with resumability

## 🚫 What You Can Ignore

- `internal/` folder - All the complex plumbing (but you can use the exported services)
- `redis.ts` - Database connections
- `stream-manager.ts` - Stream handling (but you can use the exported functions)

**Focus on your agent logic, not the infrastructure!**

## ❓ Need Help?

- Check the examples above
- Look at `src/mastra/agents/builder.ts` for the default agent pattern
- Use the pre-configured `builderAgent` to get started quickly
- Create your own agent when you need custom behavior

**Happy building! 🎉**
