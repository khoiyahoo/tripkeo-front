import { useEffect, useState } from "react";

import { subscribeToTrip } from "@/services/tripService";

import type { TripWithId } from "@/types/firestore";

interface UseTripResult {
  trip: TripWithId | null;
  isLoading: boolean;
  error: string | null;
}

export const useTrip = (tripId: string): UseTripResult => {
  const [trip, setTrip] = useState<TripWithId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToTrip(
      tripId,
      (data) => {
        setTrip(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [tripId]);

  return { trip, isLoading, error };
};
