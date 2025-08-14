# ChatGPT Integration voor AI App Builder

## 🚀 **Overzicht**

Deze documentatie beschrijft de volledige integratie van ChatGPT (GPT-4o) in de AI App Builder, inclusief MCP configuratie, Freestyle integratie, en optimalisaties.

## 🔧 **Environment Variables**

### **Verplichte Variables**

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Freestyle Configuration
FREESTYLE_API_KEY=your_freestyle_api_key_here
```

### **Optionele Variables**

```bash
# MCP Configuration
MCP_TIMEOUT=30000
MCP_MAX_RETRIES=3
MCP_RETRY_DELAY=1000
MCP_KEEP_ALIVE=true
MCP_DEBUG=false

# Morph LLM (optioneel)
MORPH_API_KEY=your_morph_api_key_here
MORPH_API_TIMEOUT=30000
MORPH_FAST_APPLY_ENABLED=true
MORPH_CACHE_TTL=300000
MORPH_MAX_RETRIES=3
```

## 🏗️ **Architectuur**

### **Componenten**

1. **Builder Agent** - ChatGPT-geoptimaliseerde agent
2. **MCP Client** - Enhanced MCP configuratie voor ChatGPT
3. **AI Service** - Streamlined service voor ChatGPT interacties
4. **Memory System** - PostgreSQL met vector search
5. **Freestyle Tools** - MCP tools voor development

### **Data Flow**

```
User Request → ChatGPT Agent → MCP Client → Freestyle Tools → Response
     ↓              ↓              ↓              ↓
  Memory ←    System Message ←  Toolsets ←   File System
```

## 🔄 **Wijzigingen van Claude naar ChatGPT**

### **1. Model Configuratie**

```typescript
// Oud (Claude)
import { anthropic } from "@ai-sdk/anthropic";
model: anthropic("claude-3-7-sonnet-20241022")

// Nieuw (ChatGPT)
import { openai } from "@ai-sdk/openai";
model: openai("gpt-4o")
```

### **2. System Message**

- Geoptimaliseerd voor GPT-4o's sterke punten
- Meer gestructureerde instructies
- Betere error handling
- Performance optimalisaties

### **3. MCP Configuratie**

- Enhanced error handling
- Retry logic
- Better toolset management
- ChatGPT-specifieke optimalisaties

## 🛠️ **Configuratie Bestanden**

### **1. MCP Configuratie (`src/lib/mcp-config.ts`)**

```typescript
export class ChatGPTMCPClient {
  // Enhanced MCP client met ChatGPT optimalisaties
  // - Better error handling
  // - Retry logic
  // - Performance monitoring
}
```

### **2. AI Service (`src/lib/internal/ai-service.ts`)**

```typescript
export class AIService {
  // Streamlined service voor ChatGPT
  // - Optimized toolset management
  // - Enhanced memory handling
  // - Better error recovery
}
```

### **3. Builder Agent (`src/mastra/agents/builder.ts`)**

```typescript
export const builderAgent = new Agent({
  name: "BuilderAgent",
  model: openai("gpt-4o"),
  instructions: SYSTEM_MESSAGE, // ChatGPT-geoptimaliseerd
  memory, // Enhanced memory configuratie
  tools: {
    update_todo_list: todoTool,
  },
});
```

## 📊 **Performance Optimalisaties**

### **1. Memory Configuratie**

- `semanticRecall: true` - Betere context retrieval
- `lastMessages: 1000` - Uitgebreide conversation history
- Vector search voor snelle context lookup

### **2. MCP Optimalisaties**

- Timeout configuratie: 30 seconden
- Retry logic: 3 pogingen
- Keep-alive voor stabiele connecties
- Debug logging voor troubleshooting

### **3. ChatGPT-specifieke Optimalisaties**

- Gestructureerde system message
- Efficient toolset management
- Enhanced error handling
- Better memory utilization

## 🔍 **Troubleshooting**

### **Veelvoorkomende Problemen**

1. **OpenAI API Key Issues**
   ```bash
   # Controleer je API key
   echo $OPENAI_API_KEY
   ```

2. **MCP Connection Issues**
   ```bash
   # Controleer MCP configuratie
   MCP_DEBUG=true npm run dev
   ```

3. **Memory Issues**
   ```bash
   # Controleer database connectie
   echo $DATABASE_URL
   ```

### **Debug Commands**

```bash
# Test OpenAI connectie
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Test MCP connectie
MCP_DEBUG=true npm run dev

# Test database connectie
psql $DATABASE_URL -c "SELECT 1;"
```

## 🚀 **Deployment**

### **Vercel Deployment**

```bash
# Deploy naar Vercel
vercel --prod

# Controleer environment variables
vercel env ls
```

### **Environment Variables in Vercel**

Zorg ervoor dat alle environment variables correct zijn ingesteld in je Vercel project:

1. Ga naar je Vercel dashboard
2. Selecteer je project
3. Ga naar Settings → Environment Variables
4. Voeg alle benodigde variables toe

## 📈 **Monitoring**

### **Logs**

```bash
# Vercel logs
vercel logs

# Local logs
npm run dev
```

### **Metrics**

- MCP connection success rate
- ChatGPT response times
- Memory usage
- Error rates

## 🔮 **Toekomstige Verbeteringen**

1. **Advanced Caching** - Intelligent caching van veelgebruikte responses
2. **Streaming Optimizations** - Betere real-time streaming
3. **Tool Orchestration** - Geavanceerde tool sequencing
4. **Performance Monitoring** - Real-time performance metrics
5. **Auto-scaling** - Automatische schaling gebaseerd op load

## 📚 **Gerelateerde Documentatie**

- [Morph LLM Integration](./README.md)
- [MCP Setup](./morph-general-prompting/mcp-setup.md)
- [Best Practices](./morph-general-prompting/best-practices.md)
- [Troubleshooting](./troubleshooting.md)

---

**Laatste Update**: $(date)
**Versie**: 1.0.0
**Compatibiliteit**: ChatGPT GPT-4o, Freestyle MCP, Mastra Agents
