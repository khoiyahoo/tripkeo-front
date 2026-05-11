---
description: Create a custom hook
---

## Context

You are creating a custom hook for the Trip Sheet application.

## Instructions

1. **Name** the hook as `use[FeatureName].ts`.
2. **Place** in `src/hooks/` directory.
3. **Add JSDoc** with description, params, and return value.
4. **Define** return type explicitly.
5. **Handle** loading, error, and success states where applicable.

## Rules

- One hook = one responsibility.
- Return an object (not array) for better readability when consuming.
- Never call APIs directly — use service functions from `services/`.
- Keep hooks framework-agnostic in logic where possible.
- Don't exceed 100 lines — split into smaller hooks if needed.

## Output Format

```typescript
/**
 * [Description of what the hook does]
 * @param [paramName] - [description]
 * @returns [description of returned object]
 */
export const use[Name] = ([params]) => {
  // implementation
  return { ... }
}
```
