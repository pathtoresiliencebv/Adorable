# Morph Tool Implementatie

## Locatie

De Morph tool is geïmplementeerd in `src/tools/morph-tool.ts`

## Code Analyse

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import OpenAI from "openai";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";

const openai = new OpenAI({
  apiKey: process.env.MORPH_API_KEY,
  baseURL: "https://api.morphllm.com/v1",
});
```

## Tool Definitie

```typescript
export const morphTool = (fs: FreestyleDevServerFilesystem) =>
  createTool({
    id: "edit_file",
    description: "Use this tool to make an edit to an existing file...",
    inputSchema: z.object({
      target_file: z.string().describe("The target file to modify."),
      instructions: z.string().describe("A single sentence instruction..."),
      code_edit: z.string().describe("Specify ONLY the precise lines..."),
    }),
    execute: async ({ context: { target_file, instructions, code_edit } }) => {
      // Implementatie
    }
  });
```

## Input Schema

### target_file
- **Type**: string
- **Beschrijving**: Het pad naar het bestand dat bewerkt moet worden
- **Voorbeeld**: "src/components/Button.tsx"

### instructions
- **Type**: string
- **Beschrijving**: Een enkele zin instructie die beschrijft wat er gedaan wordt
- **Voorbeeld**: "I will add a new prop to the Button component"

### code_edit
- **Type**: string
- **Beschrijving**: De exacte code wijzigingen met `// ... existing code ...` markers
- **Voorbeeld**:
```typescript
// ... existing code ...
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  // ... existing code ...
}
```

## Execute Functie

```typescript
execute: async ({ context: { target_file, instructions, code_edit } }) => {
  // 1. Lees het bestand
  const file = await fs.readFile(target_file);
  
  // 2. Stuur naar Morph API
  const response = await openai.chat.completions.create({
    model: "morph-v3-large",
    messages: [{
      role: "user",
      content: `<instruction>${instructions}</instruction>\n<code>${file}</code>\n<update>${code_edit}</update>`
    }]
  });
  
  // 3. Schrijf het resultaat terug
  const finalCode = response.choices[0].message.content;
  await fs.writeFile(target_file, finalCode);
}
```

## API Format

De Morph API verwacht een specifiek format:

```xml
<instruction>Beschrijving van wat er gedaan wordt</instruction>
<code>Huidige bestandsinhoud</code>
<update>Gewenste wijzigingen met markers</update>
```

## Error Handling

- **File not found**: Gooit een error als het bestand niet bestaat
- **No code returned**: Error als de API geen code teruggeeft
- **Invalid response**: Error bij ongeldige API responses

## Integratie met Mastra

De tool wordt geïntegreerd in de Mastra agent via:

```typescript
toolsets: {
  ...(process.env.MORPH_API_KEY
    ? {
        morph: {
          edit_file: morphTool(fs),
        },
      }
    : {}),
  ...freestyleToolsets,
}
```

## Best Practices

1. **Gebruik duidelijke instructies**: Beschrijf precies wat er gedaan moet worden
2. **Minimaliseer code**: Gebruik `// ... existing code ...` markers efficiënt
3. **Test wijzigingen**: Controleer altijd het resultaat
4. **Backup**: Zorg voor versie controle via Git

## Voorbeelden

### Eenvoudige wijziging
```typescript
{
  target_file: "src/components/Button.tsx",
  instructions: "I will add a disabled prop to the Button component",
  code_edit: `
interface ButtonProps {
  disabled?: boolean;
  // ... existing code ...
}
  `
}
```

### Complexe wijziging
```typescript
{
  target_file: "src/pages/index.tsx",
  instructions: "I will add a new section with a contact form",
  code_edit: `
// ... existing code ...
      <section className="contact-section">
        <h2>Contact Us</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" />
          <button type="submit">Send</button>
        </form>
      </section>
// ... existing code ...
  `
}
```
