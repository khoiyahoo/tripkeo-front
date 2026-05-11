--- 
applyTo: "src/**/*.{css,tsx,jsx}"
---

```markdown

## Style Rules

### Tailwind CSS Colors

- All colors **MUST** be defined in a **single global file**:
  - Tailwind < v4: `tailwind.config.js` → `theme.extend.colors`
  - Tailwind v4: `index.css` → `@theme`
- Colors grouped by category: `primary`, `secondary`, `neutral`, `success`, `warning`, `error`.
- Sorted light → dark (50 → 950).
- **NEVER** hardcode colors (`bg-[#FF5733]` ❌ → `bg-primary-500` ✅).

### Class Naming

- Use Tailwind utility classes as primary styling method.
- No inline `style={{ }}` unless dynamic values are absolutely required.
- For complex/repeated class combinations → extract with `@apply` in CSS or create component.

### Responsive Design

- Mobile-first approach: base styles for mobile, then `sm:`, `md:`, `lg:`, `xl:`.
- Always test layout at common breakpoints.

### Ordering Tailwind Classes

Follow consistent order:
1. Layout (flex, grid, position)
2. Sizing (w, h, p, m)
3. Typography (text, font)
4. Visual (bg, border, shadow, rounded)
5. Interactive (hover, focus, transition)

```tsx
// ✅ Good
<div className="flex items-center gap-4 p-4 text-sm text-neutral-700 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">

// ❌ Bad
<div className="hover:shadow-md text-sm shadow-sm flex bg-white p-4 rounded-lg items-center text-neutral-700 gap-4 transition-shadow">
