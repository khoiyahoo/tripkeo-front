import { useCallback, useEffect, useState } from "react";

import {
  batchUpdateActivityOrders,
  createActivity,
  deleteActivity,
  subscribeToActivities,
  updateActivity,
} from "@/services/itineraryService";
import { useAuthStore } from "@/stores/authStore";

import type { ActivityWithId, CreateActivityInput } from "@/types/firestore";

interface UseItineraryResult {
  activities: ActivityWithId[];
  isLoading: boolean;
  error: string | null;
  handleAddActivity: (input: CreateActivityInput) => Promise<string>;
  handleUpdateActivity: (
    activityId: string,
    data: Partial<CreateActivityInput>
  ) => Promise<void>;
  handleDeleteActivity: (activityId: string) => Promise<void>;
  handleBatchUpdateOrders: (
    updates: { id: string; order: number; startTime?: string; date?: string }[]
  ) => Promise<void>;
}

export const useItinerary = (tripId: string): UseItineraryResult => {
  const user = useAuthStore((s) => s.user);
  const [activities, setActivities] = useState<ActivityWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToActivities(
      tripId,
      (data) => {
        setActivities(data);
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

  const handleAddActivity = useCallback(
    (input: CreateActivityInput): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      return createActivity(tripId, input, user.uid);
    },
    [tripId, user]
  );

  const handleUpdateActivity = useCallback(
    (activityId: string, data: Partial<CreateActivityInput>): Promise<void> => {
      return updateActivity(tripId, activityId, data);
    },
    [tripId]
  );

  const handleDeleteActivity = useCallback(
    (activityId: string): Promise<void> => {
      return deleteActivity(tripId, activityId);
    },
    [tripId]
  );

  const handleBatchUpdateOrders = useCallback(
    (
      updates: {
        id: string;
        order: number;
        startTime?: string;
        date?: string;
      }[]
    ): Promise<void> => {
      return batchUpdateActivityOrders(tripId, updates);
    },
    [tripId]
  );

  return {
    activities,
    isLoading,
    error,
    handleAddActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleBatchUpdateOrders,
  };
};
