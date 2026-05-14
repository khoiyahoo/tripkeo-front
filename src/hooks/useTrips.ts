import { useCallback, useEffect, useState } from "react";

import {
  createTrip,
  deleteTrip,
  subscribeToUserTrips,
  updateTrip,
} from "@/services/tripService";
import { useAuthStore } from "@/stores/authStore";

import type { CreateTripInput, TripWithId } from "@/types/firestore";

interface UseTripsResult {
  trips: TripWithId[];
  isLoading: boolean;
  error: string | null;
  handleCreateTrip: (input: CreateTripInput) => Promise<string>;
  handleDeleteTrip: (tripId: string) => Promise<void>;
  handleUpdateTrip: (
    tripId: string,
    data: Partial<CreateTripInput>
  ) => Promise<void>;
}

export const useTrips = (): UseTripsResult => {
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<TripWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToUserTrips(
      user.uid,
      (data) => {
        setTrips(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const handleCreateTrip = useCallback(
    (input: CreateTripInput): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      return createTrip(
        input,
        user.uid,
        user.displayName ?? "",
        user.photoURL ?? "",
        user.email ?? ""
      );
    },
    [user]
  );

  const handleDeleteTrip = useCallback((tripId: string): Promise<void> => {
    return deleteTrip(tripId);
  }, []);

  const handleUpdateTrip = useCallback(
    (tripId: string, data: Partial<CreateTripInput>): Promise<void> => {
      return updateTrip(tripId, data);
    },
    []
  );

  return {
    trips,
    isLoading,
    error,
    handleCreateTrip,
    handleDeleteTrip,
    handleUpdateTrip,
  };
};
