# Morph API Integratie

## API Endpoint

Morph LLM gebruikt een aangepaste OpenAI-compatible API endpoint:

```
Base URL: https://api.morphllm.com/v1
Model: morph-v3-large
```

## Configuratie

```typescript
const openai = new OpenAI({
  apiKey: process.env.MORPH_API_KEY,
  baseURL: "https://api.morphllm.com/v1",
});
```

## API Request Format

### Chat Completion Request

```typescript
const response = await openai.chat.completions.create({
  model: "morph-v3-large",
  messages: [{
    role: "user",
    content: `<instruction>${instructions}</instruction>\n<code>${file}</code>\n<update>${code_edit}</update>`
  }]
});
```

### Message Content Format

De content moet een specifiek XML-achtig format volgen:

```xml
<instruction>Beschrijving van wat er gedaan moet worden</instruction>
<code>Huidige bestandsinhoud</code>
<update>Gewenste wijzigingen met markers</update>
```

## Response Format

```typescript
interface MorphResponse {
  choices: [{
    message: {
      content: string; // De bewerkte code
    }
  }]
}
```

## Error Handling

### API Errors

```typescript
try {
  const response = await openai.chat.completions.create({
    // ... configuratie
  });
  
  const finalCode = response.choices[0].message.content;
  
  if (!finalCode) {
    throw new Error("No code returned from Morph API.");
  }
  
  await fs.writeFile(target_file, finalCode);
} catch (error) {
  throw new Error(
    `Morph API error: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

### Common Error Scenarios

1. **Invalid API Key**
   - Error: 401 Unauthorized
   - Oplossing: Controleer `MORPH_API_KEY` environment variable

2. **Rate Limiting**
   - Error: 429 Too Many Requests
   - Oplossing: Implementeer retry logic met exponential backoff

3. **Invalid Content Format**
   - Error: 400 Bad Request
   - Oplossing: Controleer XML format van de content

4. **Model Not Available**
   - Error: 404 Not Found
   - Oplossing: Controleer model naam "morph-v3-large"

## Rate Limiting

Morph API heeft rate limiting. Implementeer retry logic:

```typescript
async function callMorphAPIWithRetry(content: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: "morph-v3-large",
        messages: [{ role: "user", content }]
      });
      return response;
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

## Content Validation

### Instruction Validation

```typescript
function validateInstruction(instruction: string): boolean {
  return instruction.length > 0 && instruction.length < 1000;
}
```

### Code Validation

```typescript
function validateCode(code: string): boolean {
  return code.length > 0 && code.length < 100000; // 100KB limit
}
```

### Update Validation

```typescript
function validateUpdate(update: string): boolean {
  return update.length > 0 && update.includes("// ... existing code ...");
}
```

## Performance Monitoring

### Response Time Tracking

```typescript
async function callMorphAPI(content: string) {
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: "morph-v3-large",
      messages: [{ role: "user", content }]
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`Morph API response time: ${responseTime}ms`);
    
    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`Morph API error after ${responseTime}ms:`, error);
    throw error;
  }
}
```

### Success Rate Tracking

```typescript
let successCount = 0;
let totalCount = 0;

async function trackMorphAPICall(fn: () => Promise<any>) {
  totalCount++;
  try {
    const result = await fn();
    successCount++;
    return result;
  } catch (error) {
    console.error(`Morph API call failed. Success rate: ${successCount}/${totalCount}`);
    throw error;
  }
}
```

## Environment Variables

### Required

```env
MORPH_API_KEY=your_morph_api_key_here
```

### Optional

```env
MORPH_API_TIMEOUT=30000  # Timeout in milliseconds
MORPH_API_MAX_RETRIES=3  # Maximum retry attempts
MORPH_API_BASE_URL=https://api.morphllm.com/v1  # Custom base URL
```

## Testing

### Unit Tests

```typescript
describe('Morph API Integration', () => {
  it('should call Morph API with correct format', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'updated code' } }]
          })
        }
      }
    };
    
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('Morph Tool Integration', () => {
  it('should edit file using Morph API', async () => {
    const fs = createMockFilesystem();
    const tool = morphTool(fs);
    
    await tool.execute({
      context: {
        target_file: 'test.ts',
        instructions: 'Add a new function',
        code_edit: '// ... existing code ...\nfunction newFunction() {}\n// ... existing code ...'
      }
    });
    
    // Verify file was updated
  });
});
```
