---
description: Write unit/integration tests
---

## Context

You are writing tests for the Trip Sheet application.

## Instructions

1. **Place** test file next to the source file: `ComponentName.test.tsx` or in `__tests__/`.
2. **Follow** AAA pattern: Arrange → Act → Assert.
3. **Test** behavior, not implementation details.
4. **Cover**: happy path, edge cases, error states.

## Rules

- Use React Testing Library for component tests.
- Mock API calls — never hit real endpoints in tests.
- Test user interactions (click, type, submit), not internal state.
- Each test should be independent — no shared mutable state.
- Descriptive test names: `should [expected behavior] when [condition]`.

## Output Format

```typescript
describe('[ComponentName]', () => {
  it('should render trip title correctly', () => {
    // Arrange
    render(<TripCard title="Ha Long Bay" />)

    // Assert
    expect(screen.getByText('Ha Long Bay')).toBeInTheDocument()
  })

  it('should call onDelete when delete button is clicked', async () => {
    // Arrange
    const onDelete = vi.fn()
    render(<TripCard onDelete={onDelete} />)

    // Act
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    // Assert
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
```
