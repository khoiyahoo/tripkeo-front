---
description: Create an API service file
---

## Context

You are creating an API service for the Trip Sheet application.

## Instructions

1. **Place** in `src/services/[featureName]Service.ts`.
2. **Use** the centralized API client (`apiClient`).
3. **Type** all request payloads and responses.
4. **Group** related endpoints in a single object export.

## Rules

- One service file per feature/module.
- All functions must return typed Promises.
- No business logic in services — only HTTP calls.
- Use RESTful naming conventions for function names.

## Output Format

```typescript
import { apiClient } from '@/lib/apiClient'
import { [Type], [Payload] } from '@/types/[feature]'

export const [feature]Service = {
  getAll: (): Promise<Type[]> => apiClient.get('/endpoint'),
  getById: (id: string): Promise<Type> => apiClient.get(`/endpoint/${id}`),
  create: (data: CreatePayload): Promise<Type> => apiClient.post('/endpoint', data),
  update: (id: string, data: UpdatePayload): Promise<Type> => apiClient.put(`/endpoint/${id}`, data),
  delete: (id: string): Promise<void> => apiClient.delete(`/endpoint/${id}`),
}
```
