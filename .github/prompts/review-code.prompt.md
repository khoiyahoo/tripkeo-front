---
description: Review code and suggest improvements
---

## Context

You are reviewing code in the Trip Sheet application.

## Instructions

Review the provided code against project standards and provide feedback.

## Checklist

### Must Fix (Blocking)
- [ ] No `any` types
- [ ] Component <= 250 lines
- [ ] No hardcoded colors — uses design tokens
- [ ] Business logic in hooks, not components
- [ ] Props explicitly typed
- [ ] No `console.log`
- [ ] No unused imports/variables

### Should Fix (Non-blocking)
- [ ] Naming conventions followed
- [ ] Loading/error states handled
- [ ] Proper atomic level (atom/molecule/organism)
- [ ] No magic numbers — use constants
- [ ] Tailwind classes in correct order
- [ ] No prop drilling > 3 levels

### Nice to Have
- [ ] JSDoc on exported functions/hooks
- [ ] Edge cases considered
- [ ] Accessible (keyboard, aria-labels)

## Output Format

```
### ✅ Good
[What's done well]

### 🔴 Must Fix
[Critical issues with suggested fix]

### 🟡 Should Fix
[Important improvements]

### 💡 Suggestions
[Optional improvements]
```
