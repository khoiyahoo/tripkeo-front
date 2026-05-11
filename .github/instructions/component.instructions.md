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

### Shadcn/UI First

- **Always prioritize** using existing Shadcn/UI components as the base.
- **DO NOT** build custom components from scratch if Shadcn/UI already provides one (Button, Input, Dialog, Select, Card, Table, etc.).
- **Customize** Shadcn/UI components by modifying directly in `src/components/ui/` to match the design system.
- Shadcn/UI components are **NOT a black box** — they are copied into your project and **meant to be modified**.
- When the system doesn't have a needed component → **install it from Shadcn/UI first**, then customize.

### Shadcn/UI Customization Strategy

Need a UI element?
│
├─ Does the project already have it in src/components/ui/?
│ ├─ YES → Modify that file directly to match design.
│ └─ NO → Does Shadcn/UI provide it?
│ ├─ YES → Install it (npx shadcn@latest add [component]),
│ │ then modify the source in src/components/ui/ to fit design.
│ └─ NO → Build custom component following atomic design rules.

### How to Modify Shadcn/UI Components

- Edit **directly** in `src/components/ui/[component].tsx`.
- Adjust styles (colors, spacing, radius, sizes) using project design tokens.
- Add new **variants** or **sizes** via `cva()` (class-variance-authority) if needed.
- Extend props interface to support project-specific needs.
- Keep the component's **core API** intact for consistency.

```tsx
// ✅ Good — modify Shadcn Button directly in src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700",  // ← use design tokens
        destructive: "bg-error-600 text-white hover:bg-error-700",
        outline: "border border-neutral-300 bg-white hover:bg-neutral-50",
        ghost: "hover:bg-neutral-100",
        // ✅ Add project-specific variant
        trip: "bg-primary-100 text-primary-700 hover:bg-primary-200",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        // ✅ Add project-specific size
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

// ✅ Good — extend Shadcn Input with project needs directly in src/components/ui/input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean  // ← added for form validation styling
  leftIcon?: React.ReactNode  // ← added for icon support
}

const Input = ({ className, isError, leftIcon, ...props }: InputProps) => {
  return (
    <div className="relative">
      {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{leftIcon}</span>}
      <input
        className={cn(
          "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm",
          leftIcon && "pl-10",
          isError ? "border-error-500 focus:ring-error-500" : "border-neutral-300 focus:ring-primary-500",
          className
        )}
        {...props}
      />
    </div>
  )
}

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
