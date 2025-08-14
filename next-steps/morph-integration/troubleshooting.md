# Morph LLM Troubleshooting

## Veelvoorkomende Problemen

### 1. API Key Problemen

#### Probleem: 401 Unauthorized Error
```
Error: Request failed with status code 401
```

**Oplossingen:**
1. Controleer of `MORPH_API_KEY` is ingesteld in je `.env` bestand
2. Verifieer dat de API key geldig is op [morphllm.com](https://morphllm.com)
3. Controleer of de API key niet is verlopen
4. Zorg dat er geen extra spaties of newlines in de API key staan

```bash
# Controleer environment variable
echo $MORPH_API_KEY

# Of in Node.js
console.log(process.env.MORPH_API_KEY);
```

#### Probleem: Invalid API Key Format
```
Error: Invalid API key format
```

**Oplossing:**
- API keys moeten beginnen met `morph_` gevolgd door een reeks karakters
- Controleer de exacte format van je API key

### 2. Rate Limiting Problemen

#### Probleem: 429 Too Many Requests
```
Error: Request failed with status code 429
```

**Oplossingen:**
1. Implementeer retry logic met exponential backoff
2. Verminder de frequentie van API calls
3. Gebruik caching voor herhaalde requests
4. Controleer je API usage limits

```typescript
// Retry logic implementatie
async function callMorphWithRetry(content: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({
        model: "morph-v3-large",
        messages: [{ role: "user", content }]
      });
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Content Format Problemen

#### Probleem: 400 Bad Request
```
Error: Invalid content format
```

**Oplossingen:**
1. Controleer of de content het juiste XML format heeft
2. Zorg dat alle tags correct zijn gesloten
3. Controleer of de bestandsinhoud niet te groot is

```typescript
// Valideer content format
function validateContent(instructions: string, code: string, update: string): boolean {
  return (
    instructions.length > 0 &&
    instructions.length < 1000 &&
    code.length > 0 &&
    code.length < 100000 &&
    update.length > 0 &&
    update.includes('// ... existing code ...')
  );
}
```

#### Probleem: Missing Code Markers
```
Error: No code markers found in update
```

**Oplossing:**
- Zorg dat je `// ... existing code ...` markers gebruikt in je code_edit
- Deze markers zijn essentieel voor Morph om te begrijpen waar wijzigingen moeten worden toegepast

### 4. File System Problemen

#### Probleem: File Not Found
```
Error: File not found: src/components/Button.tsx
```

**Oplossingen:**
1. Controleer of het bestandspad correct is
2. Zorg dat het bestand bestaat in de Freestyle sandbox
3. Controleer of je de juiste working directory gebruikt

```typescript
// Debug file existence
async function debugFileExists(fs: any, target_file: string) {
  try {
    const content = await fs.readFile(target_file);
    console.log(`File exists, size: ${content.length} bytes`);
    return true;
  } catch (error) {
    console.error(`File not found: ${target_file}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}
```

#### Probleem: Permission Denied
```
Error: Permission denied when writing file
```

**Oplossingen:**
1. Controleer of je schrijfrechten hebt in de sandbox
2. Zorg dat de Freestyle identity correct is ingesteld
3. Controleer of de sandbox niet in read-only mode is

### 5. Model Problemen

#### Probleem: Model Not Available
```
Error: Model morph-v3-large not found
```

**Oplossingen:**
1. Controleer of je toegang hebt tot het morph-v3-large model
2. Verifieer je API plan en model toegang
3. Probeer een ander model als alternatief

```typescript
// Fallback naar alternatief model
const models = ['morph-v3-large', 'morph-v3', 'morph-v2'];
let response;

for (const model of models) {
  try {
    response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content }]
    });
    break;
  } catch (error) {
    console.log(`Model ${model} not available, trying next...`);
  }
}
```

### 6. Response Problemen

#### Probleem: Empty Response
```
Error: No code returned from Morph API
```

**Oplossingen:**
1. Controleer of de API call succesvol was
2. Valideer de response format
3. Controleer of er geen content filtering is toegepast

```typescript
// Valideer response
const response = await openai.chat.completions.create({
  model: "morph-v3-large",
  messages: [{ role: "user", content }]
});

const finalCode = response.choices[0]?.message?.content;

if (!finalCode) {
  console.error('Empty response from Morph API');
  console.error('Response:', JSON.stringify(response, null, 2));
  throw new Error('No code returned from Morph API');
}
```

#### Probleem: Invalid Code Generated
```
Error: Generated code has syntax errors
```

**Oplossingen:**
1. Controleer de gegenereerde code op syntax fouten
2. Gebruik een linter om de code te valideren
3. Implementeer een syntax checker

```typescript
// Syntax validation
function validateSyntax(code: string): boolean {
  try {
    // Voor TypeScript/JavaScript
    require('@babel/parser').parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });
    return true;
  } catch (error) {
    console.error('Syntax error in generated code:', error.message);
    return false;
  }
}
```

## Debugging Tools

### 1. Logging Setup

```typescript
// Voeg uitgebreide logging toe
const DEBUG = process.env.MORPH_DEBUG === 'true';

if (DEBUG) {
  console.log('=== Morph API Debug ===');
  console.log('Target file:', target_file);
  console.log('Instructions:', instructions);
  console.log('Code edit length:', code_edit.length);
  console.log('File content length:', file.length);
}
```

### 2. Dry Run Mode

```typescript
// Test zonder daadwerkelijk bestanden te wijzigen
const DRY_RUN = process.env.MORPH_DRY_RUN === 'true';

if (DRY_RUN) {
  console.log('=== DRY RUN MODE ===');
  console.log('Would apply:', finalCode);
  return;
}
```

### 3. Backup System

```typescript
// Maak backup voordat je wijzigingen toepast
async function safeEdit(fs: any, target_file: string, newContent: string) {
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
```

## Performance Problemen

### 1. Slow Response Times

**Symptomen:**
- API calls duren langer dan 10 seconden
- Timeout errors
- Gebruiker ervaart vertraging

**Oplossingen:**
1. Implementeer caching
2. Gebruik connection pooling
3. Optimaliseer content size
4. Implementeer parallel processing waar mogelijk

```typescript
// Caching implementatie
const fileCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuten

async function getCachedFile(fs: any, target_file: string): Promise<string> {
  const cached = fileCache.get(target_file);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  
  const content = await fs.readFile(target_file);
  fileCache.set(target_file, { content, timestamp: Date.now() });
  return content;
}
```

### 2. Memory Leaks

**Symptomen:**
- Toenemend geheugengebruik
- Langzame performance na verloop van tijd
- Crashes bij langdurig gebruik

**Oplossingen:**
1. Clear caches regelmatig
2. Implementeer garbage collection
3. Monitor memory usage

```typescript
// Cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of fileCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      fileCache.delete(key);
    }
  }
}, CACHE_TTL);
```

## Monitoring en Alerting

### 1. Error Tracking

```typescript
// Implementeer error tracking
function trackError(error: Error, context: any) {
  console.error('Morph API Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
  
  // Stuur naar error tracking service (bijv. Sentry)
  // Sentry.captureException(error, { extra: context });
}
```

### 2. Performance Monitoring

```typescript
// Monitor API performance
async function trackPerformance<T>(fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    console.log(`Morph API call completed in ${duration}ms`);
    
    // Stuur metrics naar monitoring service
    // metrics.timing('morph.api.duration', duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Morph API call failed after ${duration}ms:`, error);
    throw error;
  }
}
```

## Support en Resources

### 1. Officiële Documentatie
- [Morph LLM Documentation](https://docs.morphllm.com)
- [API Reference](https://docs.morphllm.com/api)
- [Examples](https://docs.morphllm.com/examples)

### 2. Community Support
- [Morph Discord](https://discord.gg/morphllm)
- [GitHub Issues](https://github.com/morphllm/morph/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/morphllm)

### 3. Debugging Commands

```bash
# Test API key
curl -H "Authorization: Bearer $MORPH_API_KEY" \
     https://api.morphllm.com/v1/models

# Test API endpoint
curl -X POST https://api.morphllm.com/v1/chat/completions \
     -H "Authorization: Bearer $MORPH_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "morph-v3-large",
       "messages": [{"role": "user", "content": "test"}]
     }'
```
