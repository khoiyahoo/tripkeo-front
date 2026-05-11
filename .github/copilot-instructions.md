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

### Assets

- Icons/images from design → `src/assets/icons/` or `src/assets/images/`.
- Naming: **kebab-case** → `arrow-left.svg`, `hero-banner.webp`.
- Prefer **SVG** for icons, **WebP** for images.
- Common icons (arrow, close, search...) → use `lucide-react`. Custom SVG only for project-specific icons.
- Use **SVGR** to import SVG as React components:

```tsx
// ✅ As component (styled with Tailwind)
import ArrowLeft from '@/assets/icons/arrow-left.svg?react'
<ArrowLeft className="w-5 h-5 text-primary-500" />

// ✅ As URL (for <img> or background)
import heroSectionUrl from '@/assets/images/hero-section.png'
<img src={heroSectionUrl} alt="back" />
```

### Import Alias

- **Always** use path aliases — **NEVER** use relative paths like `../../`.
- Defined aliases:

| Alias | Path | Example |
|-------|------|---------|
| `@/` | `src/` | `import { Button } from '@/components/ui/button'` |
| `@/assets` | `src/assets/` | `import logo from '@/assets/images/logo.png'` |
| `@/components` | `src/components/` | `import { TripCard } from '@/components/organisms/TripCard'` |
| `@/hooks` | `src/hooks/` | `import { useTripData } from '@/hooks/useTripData'` |
| `@/services` | `src/services/` | `import { tripService } from '@/services/tripService'` |
| `@/types` | `src/types/` | `import { Trip } from '@/types/trip'` |
| `@/utils` | `src/utils/` | `import { formatDate } from '@/utils/formatDate'` |
| `@/constants` | `src/constants/` | `import { ROUTES } from '@/constants/routes'` |
| `@/stores` | `src/stores/` | `import { useAuthStore } from '@/stores/authStore'` |
| `@/styles` | `src/styles/` | `import '@/styles/globals.css'` |

```tsx
// ✅ Good
import { Button } from '@/components/ui/button'
import { useTripData } from '@/hooks/useTripData'
import { Trip } from '@/types/trip'
import { formatCurrency } from '@/utils/formatCurrency'
import heroImage from '@/assets/images/hero.webp'

// ❌ Bad — relative paths
import { Button } from '../../../components/ui/button'
import { useTripData } from '../../hooks/useTripData'
