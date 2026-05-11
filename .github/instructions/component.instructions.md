---
applyTo: "src/components/**"
---

# .github/instructions/component.instructions.md

## Component Rules

### Structure

- Max **250 lines** per component. If exceeded → split or extract hooks.
- One file = one main exported component.
- Props must be **destructured** in function parameters.

### Design Principles

- Separate **UI rendering** from **business logic**.
- All complex logic **MUST** be in custom hooks — components only render.
- Prefer **Composition** over prop drilling (max 3 levels).
- Avoid nested ternary > 2 levels → extract into variables or sub-components.

### Props

- Always define explicit TypeScript interface for props.
- Boolean props use `is/has/should/can` prefix.
- Event handler props use `on` prefix → `onClick`, `onSubmit`.

```tsx
// ✅ Good
interface TripCardProps {
  title: string
  destination: string
  isActive: boolean
  onSelect: (id: string) => void
}

const TripCard = ({ title, destination, isActive, onSelect }: TripCardProps) => {
  return (...)
}

// ✅ Good
const TripList = () => {
  const { trips, isLoading, error } = useTrips()
  
  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />
  
  return <div>{trips.map(trip => <TripCard key={trip.id} {...trip} />)}</div>
}
