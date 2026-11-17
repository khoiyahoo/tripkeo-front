import { useEffect, useState } from "react";

import { subscribeToTrip } from "@/services/tripService";

import type { TripWithId } from "@/types/firestore";

export const useTrip = (tripId: string) => {
  const [trip, setTrip] = useState<TripWithId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    return subscribeToTrip(
      tripId,
      (data) => {
        setTrip(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [tripId]);

  return { trip, isLoading, error };
};
