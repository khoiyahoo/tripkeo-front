---
applyTo: 'hooks/**'
--- 

### Structure

```typescript
/**
 * Fetches and manages trip list data.
 *
 * Responsibilities:
 * - Fetch trip data from API
 * - Handle loading/error states
 * - Expose derived values
 *
 * @param filters - Optional filter parameters
 * @returns Trip data, loading state, and error state
 */
export const useTripData = (filters?: TripFilters) => {
  // 1. External hooks
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // 2. Local state
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null)

  // 3. Memoized values
  const formattedFilters = useMemo(() => {
    return normalizeFilters(filters)
  }, [filters])

  // 4. API / async logic
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['trips', formattedFilters],
    queryFn: () => fetchTrips(formattedFilters)
  })

  // 5. Event handlers / business logic
  const handleSelectTrip = useCallback((id: string) => {
    setSelectedTrip(id)
  }, [])

  // 6. Return only what consumers need
  return {
    trips: data ?? [],
    selectedTrip,
    isLoading,
    error,
    refetch,
    handleSelectTrip
  }
}