---
description: Create TypeScript type definitions
---

## Context

You are creating type definitions for the Trip Sheet application.

## Instructions

1. **Place** in `src/types/[featureName].ts`.
2. **Use `interface`** for object shapes, **`type`** for unions/intersections.
3. **Export** all types — no default exports.
4. **Group** related types in the same file.

## Rules

- No `any` — use `unknown` if type is truly dynamic.
- Use `Pick`, `Omit`, `Partial` to derive types — avoid duplication.
- Enum-like values use `as const` objects or string union types.
- API response types and UI/form types should be separate.
- Suffix conventions:
  - `[Name]Props` — component props
  - `[Name]Payload` — API request body
  - `[Name]Response` — API response
  - `[Name]FormValues` — form data

## Output Format

```typescript
// types/trip.ts

export interface Trip {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: TripStatus
  expenses: Expense[]
}

export type TripStatus = 'draft' | 'planned' | 'ongoing' | 'completed'

export type CreateTripPayload = Omit<Trip, 'id' | 'status' | 'expenses'>

export type TripFormValues = Pick<Trip, 'title' | 'destination'> & {
  dateRange: [Date, Date]
}
```
