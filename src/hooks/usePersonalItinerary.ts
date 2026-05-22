import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  batchUpdatePersonalActivityOrders,
  createPersonalActivity,
  deletePersonalActivity,
  subscribeToPersonalActivities,
  updatePersonalActivity,
} from "@/services/personalActivityService";
import { useAuthStore } from "@/stores/authStore";

import type {
  CreatePersonalActivityInput,
  PersonalActivityWithId,
} from "@/types/firestore";

interface UsePersonalItineraryResult {
  activities: PersonalActivityWithId[];
  isLoading: boolean;
  handleAdd: (input: CreatePersonalActivityInput) => Promise<string>;
  handleUpdate: (
    id: string,
    data: Partial<CreatePersonalActivityInput>
  ) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleBatchUpdateOrders: (
    updates: { id: string; order: number; date?: string; startTime?: string }[]
  ) => Promise<void>;
}

export const usePersonalItinerary = (
  tripId: string
): UsePersonalItineraryResult => {
  // 1. External state
  const user = useAuthStore((s) => s.user);

  // 2. Local state
  const [activities, setActivities] = useState<PersonalActivityWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 3. Subscribe
  useEffect(() => {
    if (!tripId || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToPersonalActivities(
      tripId,
      user.uid,
      (data) => {
        setActivities(data);
        setIsLoading(false);
      },
      (err) => {
        // biome-ignore lint/suspicious/noConsole: dev diagnostic for subscription errors
        console.error("[usePersonalItinerary] subscription error:", err);
        toast.error("Không thể tải lịch trình cá nhân. Vui lòng thử lại.");
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [tripId, user]);

  // 4. Handlers
  const handleAdd = useCallback(
    (input: CreatePersonalActivityInput): Promise<string> => {
      if (!user) {
        toast.error("Bạn cần đăng nhập để thực hiện thao tác này.");
        return Promise.reject(new Error("Not authenticated"));
      }
      return createPersonalActivity(tripId, input, user.uid);
    },
    [tripId, user]
  );

  const handleUpdate = useCallback(
    (id: string, data: Partial<CreatePersonalActivityInput>): Promise<void> =>
      updatePersonalActivity(tripId, id, data),
    [tripId]
  );

  const handleDelete = useCallback(
    (id: string): Promise<void> => deletePersonalActivity(tripId, id),
    [tripId]
  );

  const handleBatchUpdateOrders = useCallback(
    (
      updates: {
        id: string;
        order: number;
        date?: string;
        startTime?: string;
      }[]
    ): Promise<void> => batchUpdatePersonalActivityOrders(tripId, updates),
    [tripId]
  );

  // 5. Return
  return {
    activities,
    isLoading,
    handleAdd,
    handleUpdate,
    handleDelete,
    handleBatchUpdateOrders,
  };
};
