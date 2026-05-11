---
description: Refactor existing code
---

## Context

You are refactoring code in the Trip Sheet application to improve quality without changing behavior.

## Instructions

1. **Identify** what needs refactoring (long component, duplicated logic, poor naming, etc.).
2. **Plan** the refactoring steps before making changes.
3. **Ensure** behavior remains exactly the same after refactoring.
4. **Follow** project conventions (Atomic Design, hooks extraction, naming).

## Rules

- Do NOT change functionality — only improve code structure.
- Extract logic > 20 lines into custom hooks.
- Extract repeated UI patterns into shared components.
- Replace magic values with named constants.
- Break components exceeding 250 lines.
- Ensure TypeScript types are strict (no `any` introduced).

## Output Format

```
### What's Being Refactored
[Description]

### Why
[Reason: readability / reusability / performance / convention compliance]

### Changes
[List of changes with before/after]
```
