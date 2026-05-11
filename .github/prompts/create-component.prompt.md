---
description: Create a new component following Atomic Design
---

## Context

You are creating a new component for the Trip Sheet application using Atomic Design methodology.

## Instructions

1. **Determine** the atomic level (atom / molecule / organism) based on complexity.
2. **Create** the component file structure:
	```
	ComponentName/
	├── ComponentName.tsx
	├── ComponentName.types.ts
	└── index.ts
	```
3. **Define** props interface in `.types.ts` file.
4. **Implement** the component following project conventions.
5. **Use** design tokens for all colors — never hardcode.

## Rules

- Atoms: purely presentational, no hooks, no API calls.
- Molecules: combine 2–5 atoms, simple local state only.
- Organisms: can use custom hooks, connect to API/global state.
- Max 250 lines per component.
- All props must have explicit TypeScript types.
- Destructure props in function parameters.

## Output

Provide all files needed for the component with complete implementation.

