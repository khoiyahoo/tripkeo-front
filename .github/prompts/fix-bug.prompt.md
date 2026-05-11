---
description: Fix a bug in the codebase
---

## Context

You are fixing a bug in the Trip Sheet application.

## Instructions

1. **Identify** the root cause — don't just fix symptoms.
2. **Explain** what causes the bug before writing any code.
3. **Fix** with minimal changes — avoid refactoring unrelated code.
4. **Verify** the fix doesn't break existing functionality.
5. **Add** a comment explaining the fix if the root cause is non-obvious.

## Rules

- Do NOT change component structure unless necessary for the fix.
- Do NOT introduce new dependencies for a simple fix.
- Keep the fix within the same coding conventions (see copilot-instructions.md).
- If the bug is caused by a type issue, fix the type — don't use `any`.

## Output Format

```
### Bug Description
[What's happening vs what's expected]

### Root Cause
[Why it's happening]

### Fix
[Code changes]

### Impact
[What else could be affected]
```