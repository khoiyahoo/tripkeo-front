import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  CreatePersonalActivityInput,
  PersonalActivityDoc,
  PersonalActivityWithId,
} from "@/types/firestore";

const personalActivitiesRef = (tripId: string) =>
  collection(db, "trips", tripId, "personalActivities");

const toPersonalActivityWithId = (
  id: string,
  data: Record<string, unknown>
): PersonalActivityWithId => ({
  id,
  ...(data as unknown as PersonalActivityDoc),
});

/**
 * Subscribe to the current user's personal activities for a trip.
 *
 * NOTE: We intentionally avoid orderBy here because combining
 * `where("userId")` with `orderBy("date")` / `orderBy("startTime")` requires
 * a composite Firestore index that may not be deployed.  Sorting is done
 * client-side instead (see callback below).
 */
export const subscribeToPersonalActivities = (
  tripId: string,
  userId: string,
  onData: (activities: PersonalActivityWithId[]) => void,
  onError: (err: Error) => void
): (() => void) => {
  const q = query(personalActivitiesRef(tripId), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snap) => {
      const activities = snap.docs
        .map((d) => toPersonalActivityWithId(d.id, d.data()))
        // Sort client-side: date → order → startTime
        .sort((a, b) => {
          const dateCmp = a.date.localeCompare(b.date);
          if (dateCmp !== 0) return dateCmp;
          const orderCmp = (a.order ?? 9999) - (b.order ?? 9999);
          if (orderCmp !== 0) return orderCmp;
          return (a.startTime ?? "").localeCompare(b.startTime ?? "");
        });
      onData(activities);
    },
    onError
  );
};

export const createPersonalActivity = async (
  tripId: string,
  input: CreatePersonalActivityInput,
  userId: string
): Promise<string> => {
  const clean = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  );
  const docRef = await addDoc(personalActivitiesRef(tripId), {
    ...clean,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updatePersonalActivity = async (
  tripId: string,
  activityId: string,
  data: Partial<CreatePersonalActivityInput>
): Promise<void> => {
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, "trips", tripId, "personalActivities", activityId), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
};

export const deletePersonalActivity = async (
  tripId: string,
  activityId: string
): Promise<void> => {
  await deleteDoc(doc(db, "trips", tripId, "personalActivities", activityId));
};

/**
 * Batch-update order (and optionally date / startTime) for multiple personal
 * activities in one Firestore write — used by drag-and-drop reordering.
 */
export const batchUpdatePersonalActivityOrders = async (
  tripId: string,
  updates: {
    id: string;
    order: number;
    date?: string;
    startTime?: string;
  }[]
): Promise<void> => {
  const batch = writeBatch(db);
  for (const { id, order, date, startTime } of updates) {
    const ref = doc(db, "trips", tripId, "personalActivities", id);
    const payload: Record<string, unknown> = {
      order,
      updatedAt: serverTimestamp(),
    };
    if (date !== undefined) payload.date = date;
    if (startTime !== undefined) payload.startTime = startTime;
    batch.update(ref, payload);
  }
  await batch.commit();
};
