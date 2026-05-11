---
description: Create a new page component
---

## Context

You are creating a new page for the Trip Sheet application.

## Instructions

1. **Place** in `src/pages/[PageName].tsx`.
2. **Compose** the page using organisms and molecules — pages should be thin wrappers.
3. **Extract** all data fetching and logic into custom hooks.
4. **Handle** loading, error, and empty states.
5. **Add** route constant in `constants/routes.ts`.

## Rules

- Pages are composition layers — minimal logic, mostly layout.
- Must handle: loading skeleton, error fallback, empty state.
- Use `React.lazy()` for code splitting at page level.
- Max 150 lines for a page component.

## Output Format

```typescript
const [PageName] = () => {
  const { data, isLoading, error } = use[PageName]Data()

  if (isLoading) return <PageSkeleton />
  if (error) return <ErrorFallback error={error} />
  if (!data.length) return <EmptyState message="..." />

  return (
    <div className="...">
      <Organism1 data={data} />
      <Organism2 ... />
    </div>
  )
}
```
