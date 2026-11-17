import { useCallback, useEffect, useState } from "react";

import { blocking } from "@/lib/blocking";
import { createTrip, subscribeToUserTrips } from "@/services/tripService";
import { useAuthStore } from "@/stores/authStore";

import type { CreateTripInput, TripWithId } from "@/types/firestore";

interface UseTripsResult {
  trips: TripWithId[];
  isLoading: boolean;
  error: string | null;
  handleCreateTrip: (input: CreateTripInput) => Promise<string>;
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
    return subscribeToUserTrips(
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

  return {
    trips,
    isLoading,
    error,
    // gồm cả gửi lời mời nên cho thời gian chờ dài hơn
    handleCreateTrip: blocking(handleCreateTrip, 45_000),
  };
};
