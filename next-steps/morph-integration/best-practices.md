# Morph LLM Best Practices

## Algemene Richtlijnen

### 1. Duidelijke Instructies

**✅ Goed:**
```typescript
{
  instructions: "I will add a disabled prop to the Button component interface and update the component to use it"
}
```

**❌ Slecht:**
```typescript
{
  instructions: "Fix the button"
}
```

### 2. Efficiënte Code Markers

**✅ Goed:**
```typescript
interface ButtonProps {
  disabled?: boolean;
}
```

**❌ Slecht:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}
```

### 3. Incrementele Wijzigingen

**✅ Goed:** Maak kleine, gerichte wijzigingen
```typescript
// Eerst: Voeg interface toe
// Dan: Update component
// Dan: Update styling
```

**❌ Slecht:** Probeer alles in één keer te doen
```typescript
// Probeer niet een hele component te herschrijven in één edit
```

## Code Editing Patterns

### 1. Interface Uitbreiding

```typescript
interface ComponentProps {
  newProp?: string;
}
```

### 2. Function Toevoeging

```typescript
function newFunction() {
  // Implementation
}
```

### 3. Import Statements

```typescript
import { existing } from './existing';
import { newImport } from './new';
```

### 4. Component Props

```typescript
<Component
  existingProp={value}
  newProp={newValue}
/>
```

## Error Prevention

### 1. Syntax Controle

```typescript
// Controleer altijd of de gegenereerde code geldige syntax heeft
const finalCode = response.choices[0].message.content;
if (!finalCode || finalCode.includes('syntax error')) {
  throw new Error('Invalid code generated');
}
```

### 2. File Existence Check

```typescript
try {
  const file = await fs.readFile(target_file);
} catch (error) {
  throw new Error(`File not found: ${target_file}`);
}
```

### 3. Content Validation

```typescript
function validateMorphInput(instructions: string, code_edit: string): boolean {
  return (
    instructions.length > 0 &&
    instructions.length < 1000 &&
    code_edit.length > 0 &&
    code_edit.includes('// ... existing code ...')
  );
}
```

## Performance Optimalisatie

### 1. Batch Operations

```typescript
// In plaats van meerdere kleine edits, combineer ze
const combinedEdit = `
interface Props {
  prop1?: string;
  prop2?: number;
}
function Component({ prop1, prop2 }: Props) {
  // Implementation
}
`;
```

### 2. Caching

```typescript
const fileCache = new Map<string, string>();

async function getCachedFile(fs: any, target_file: string): Promise<string> {
  if (fileCache.has(target_file)) {
    return fileCache.get(target_file)!;
  }
  
  const content = await fs.readFile(target_file);
  fileCache.set(target_file, content);
  return content;
}
```

### 3. Retry Logic

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
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

## Debugging Tips

### 1. Logging

```typescript
console.log('Morph API Request:', {
  target_file,
  instructions,
  code_edit_length: code_edit.length
});

console.log('Morph API Response:', {
  content_length: finalCode.length,
  has_syntax_errors: finalCode.includes('error')
});
```

### 2. Dry Run Mode

```typescript
const DRY_RUN = process.env.MORPH_DRY_RUN === 'true';

if (DRY_RUN) {
  console.log('DRY RUN - Would apply:', finalCode);
  return;
}

await fs.writeFile(target_file, finalCode);
```

### 3. Backup Before Edit

```typescript
async function backupAndEdit(fs: any, target_file: string, newContent: string) {
  const backup = await fs.readFile(target_file);
  const backupPath = `${target_file}.backup.${Date.now()}`;
  
  try {
    await fs.writeFile(backupPath, backup);
    await fs.writeFile(target_file, newContent);
  } catch (error) {
    // Restore from backup
    await fs.writeFile(target_file, backup);
    throw error;
  }
}
```

## Common Patterns

### 1. React Component Updates

```typescript
// Voeg prop toe aan interface
interface ButtonProps {
  disabled?: boolean;
}

// Update component implementatie
export function Button({ disabled, ...props }: ButtonProps) {
  return (
    <button 
      disabled={disabled}
    >
      {/* ... existing code ... */}
    </button>
  );
}
```

### 2. Styling Updates

```typescript
const buttonStyles = {
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  }
};
```

### 3. Event Handler Updates

```typescript
const handleClick = (event: React.MouseEvent) => {
  if (disabled) return;
};
```

## Testing Strategies

### 1. Unit Tests voor Morph Tool

```typescript
describe('Morph Tool', () => {
  it('should handle simple prop addition', async () => {
    const mockFs = createMockFs({
      'Button.tsx': 'interface Props { variant: string; }'
    });
    
    const tool = morphTool(mockFs);
    await tool.execute({
      context: {
        target_file: 'Button.tsx',
        instructions: 'Add disabled prop',
        code_edit: 'interface Props { disabled?: boolean; // ... existing code ... }'
      }
    });
    
    expect(mockFs.readFile('Button.tsx')).toContain('disabled?: boolean');
  });
});
```

### 2. Integration Tests

```typescript
describe('Morph Integration', () => {
  it('should work with real Morph API', async () => {
    // Test met echte API (alleen in CI/CD)
    if (process.env.NODE_ENV === 'test') {
      // Mock API calls
    }
  });
});
```

## Troubleshooting

### 1. API Errors

- **401 Unauthorized**: Controleer API key
- **429 Rate Limited**: Implementeer retry logic
- **400 Bad Request**: Controleer content format

### 2. Code Quality Issues

- **Syntax Errors**: Controleer gegenereerde code
- **Missing Imports**: Voeg imports toe in aparte edit
- **Type Errors**: Fix TypeScript errors stap voor stap

### 3. Performance Issues

- **Slow Responses**: Implementeer caching
- **Memory Leaks**: Clear caches regelmatig
- **Timeout Errors**: Verhoog timeout waarden
