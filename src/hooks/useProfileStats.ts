import {
  collection,
  getDocs,
  query,
  type Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";

import type { ActivityDoc, ExpenseDoc, TripDoc } from "@/types/firestore";

interface ProfileStats {
  tripCount: number;
  /** Number of "sights" activities across all ended trips */
  destinationCount: number;
  /** Total amount paid by the user (paidBy matches displayName) */
  totalSpent: number;
  /** Unique co-travelers across all ended trips */
  friendCount: number;
  /** Unique trip destinations the user visited */
  places: string[];
  isLoading: boolean;
}

interface TripRow extends TripDoc {
  id: string;
}

const getTodayStr = (): string => new Date().toISOString().split("T")[0];

export const useProfileStats = (
  userId: string | undefined,
  userDisplayName: string | null | undefined
): ProfileStats => {
  const [stats, setStats] = useState<ProfileStats>({
    tripCount: 0,
    destinationCount: 0,
    totalSpent: 0,
    friendCount: 0,
    places: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!userId) {
      setStats((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    let cancelled = false;

    const load = async () => {
      const today = getTodayStr();

      // Load all trips where user is currently a member
      const tripsSnap = await getDocs(
        query(
          collection(db, "trips"),
          where("memberIds", "array-contains", userId)
        )
      );

      // Keep only ended trips (endDate < today)
      const endedTrips: TripRow[] = tripsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as TripDoc) }))
        .filter(
          (t) =>
            (t.endDate as Timestamp).toDate().toISOString().split("T")[0] <
            today
        );

      if (cancelled) return;

      // Unique destinations
      const places = [
        ...new Set(endedTrips.map((t) => t.destination).filter(Boolean)),
      ];

      // Unique co-traveler UIDs (iterate members map — includes left/removed)
      const friendUids = new Set<string>();
      for (const trip of endedTrips) {
        for (const uid of Object.keys(trip.members ?? {})) {
          if (uid !== userId) friendUids.add(uid);
        }
      }

      // Load activities (sights) and expenses (paidBy user) for each ended trip
      let destinationCount = 0;
      let totalSpent = 0;

      await Promise.all(
        endedTrips.map(async (trip) => {
          const [activitiesSnap, expensesSnap] = await Promise.all([
            getDocs(
              query(
                collection(db, "trips", trip.id, "activities"),
                where("category", "==", "sights")
              )
            ),
            userDisplayName
              ? getDocs(
                  query(
                    collection(db, "trips", trip.id, "expenses"),
                    where("paidBy", "==", userDisplayName)
                  )
                )
              : Promise.resolve(null),
          ]);

          destinationCount += activitiesSnap.size;

          if (expensesSnap) {
            for (const doc of expensesSnap.docs) {
              const data = doc.data() as ActivityDoc & ExpenseDoc;
              totalSpent += (data as ExpenseDoc).amount ?? 0;
            }
          }
        })
      );

      if (!cancelled) {
        setStats({
          tripCount: endedTrips.length,
          destinationCount,
          totalSpent,
          friendCount: friendUids.size,
          places,
          isLoading: false,
        });
      }
    };

    load().catch(() => {
      if (!cancelled) setStats((prev) => ({ ...prev, isLoading: false }));
    });

    return () => {
      cancelled = true;
    };
  }, [userId, userDisplayName]);

  return stats;
};
