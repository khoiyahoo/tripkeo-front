---
description: Optimize component/page performance
---

## Context

You are optimizing performance in the Trip Sheet application.

## Instructions

1. **Identify** the performance issue (unnecessary re-renders, heavy computation, large bundle).
2. **Measure** before optimizing — don't guess.
3. **Apply** appropriate optimization technique.
4. **Verify** the optimization actually improves performance.

## Techniques

- `React.memo()` — prevent re-renders when props don't change.
- `useMemo` — cache expensive computations.
- `useCallback` — stable function references for child components.
- `React.lazy()` + `Suspense` — code split heavy components.
- Virtualization — for long lists (react-virtual / react-window).
- Debounce/throttle — for frequent user inputs (search, resize).

## Rules

- Do NOT prematurely optimize — only optimize when there's a measurable problem.
- `useMemo`/`useCallback` are not free — only use when dependency arrays are stable.
- Prefer component splitting over memoization as first solution.
- Never sacrifice readability for minor performance gains.
