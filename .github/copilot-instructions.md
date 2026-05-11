## Project Overview

This is a **TripKeo** project — an application for creating and managing trip planning sheets.

## General Rules

### TypeScript

- **NEVER** use `any` → use `unknown` + type guards.
- All props, API responses, and function params must be **explicitly typed**.
- Types live in `types/` directory.

### Folder Structure

src/
├── components/
│ ├── atoms/ # Smallest UI units
│ ├── molecules/ # Combinations of atoms
│ └── organisms/ # Complex feature sections
├── hooks/ # Custom hooks
├── services/ # API calls
├── types/ # TypeScript definitions
├── utils/ # Helper functions
├── constants/ # Constants & enums
├── pages/ # Page components
└── styles/ # Global styles


### Naming Convention

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `TripCard.tsx` |
| Hook | use + PascalCase | `useTripData.ts` |
| Utility | camelCase | `formatDate.ts` |
| Constant | UPPER_SNAKE_CASE | `MAX_TRIP_DAYS` |
| Boolean | is/has/should prefix | `isLoading` |

### API & Services

- All API calls in `services/` — one file per feature.
- Use centralized HTTP client (Axios instance) with interceptors.
- All responses must be type-safe.

### State Management

- **Local**: `useState`
- **Server**: TanStack Query (React Query)
- **Global**: Zustand / Redux Toolkit (only when necessary)

