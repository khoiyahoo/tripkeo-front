import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { geocodeLocation } from "@/services/geocodingService";

import type {
  ActivityDoc,
  ActivityWithId,
  CreateActivityInput,
} from "@/types/firestore";

const activitiesRef = (tripId: string) =>
  collection(db, "trips", tripId, "activities");

const toActivityWithId = (
  id: string,
  data: Record<string, unknown>
): ActivityWithId => ({
  id,
  ...(data as unknown as ActivityDoc),
});

export const createActivity = async (
  tripId: string,
  input: CreateActivityInput,
  userId: string
): Promise<string> => {
  // Strip undefined – Firestore rejects document fields with undefined values
  const clean = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  );
  const activityData = {
    ...clean,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(activitiesRef(tripId), activityData);

  // Fire-and-forget geocode: use location if provided, else fall back to activity title
  const geocodeQuery = input.location?.trim() || input.title?.trim();
  if (geocodeQuery) {
    geocodeLocation(geocodeQuery)
      .then((coords) => {
        if (coords) {
          updateDoc(doc(db, "trips", tripId, "activities", docRef.id), {
            lat: coords.lat,
            lng: coords.lng,
          }).catch(() => {
            /* non-critical */
          });
        }
      })
      .catch(() => {
        /* non-critical */
      });
  }

  return docRef.id;
};

export const updateActivity = async (
  tripId: string,
  activityId: string,
  data: Partial<CreateActivityInput>
): Promise<void> => {
  // Strip undefined – Firestore rejects document fields with undefined values
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, "trips", tripId, "activities", activityId), {
    ...clean,
    updatedAt: serverTimestamp(),
  });

  // Fire-and-forget geocode when location or title changes
  const geocodeQuery = data.location?.trim() || data.title?.trim();
  if (geocodeQuery) {
    geocodeLocation(geocodeQuery)
      .then((coords) => {
        if (coords) {
          updateDoc(doc(db, "trips", tripId, "activities", activityId), {
            lat: coords.lat,
            lng: coords.lng,
          }).catch(() => {
            /* non-critical */
          });
        }
      })
      .catch(() => {
        /* non-critical */
      });
  }
};

export const deleteActivity = async (
  tripId: string,
  activityId: string
): Promise<void> => {
  await deleteDoc(doc(db, "trips", tripId, "activities", activityId));
};

/** Batch update order (and optionally startTime / date) for multiple activities */
export const batchUpdateActivityOrders = async (
  tripId: string,
  updates: { id: string; order: number; startTime?: string; date?: string }[]
): Promise<void> => {
  const batch = writeBatch(db);
  for (const { id, order, startTime, date } of updates) {
    const ref = doc(db, "trips", tripId, "activities", id);
    const data: Record<string, unknown> = {
      order,
      updatedAt: serverTimestamp(),
    };
    if (startTime !== undefined) data.startTime = startTime;
    if (date !== undefined) data.date = date;
    batch.update(ref, data);
  }
  await batch.commit();
};

export const subscribeToActivities = (
  tripId: string,
  onData: (activities: ActivityWithId[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  // Avoid composite Firestore index requirement (date + order) by fetching
  // the full collection without orderBy and sorting client-side.
  const q = activitiesRef(tripId);

  return onSnapshot(
    q,
    (snapshot) => {
      const activities = snapshot.docs
        .map((d) => toActivityWithId(d.id, d.data()))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.order - b.order;
        });
      onData(activities);
    },
    onError
  );
};

/** Atomically update dates on some activities and delete others (for trip date edits) */
export const batchUpdateAndDeleteActivities = async (
  tripId: string,
  toUpdate: { id: string; date: string }[],
  toDelete: string[]
): Promise<void> => {
  const batch = writeBatch(db);
  for (const { id, date } of toUpdate) {
    batch.update(doc(db, "trips", tripId, "activities", id), {
      date,
      updatedAt: serverTimestamp(),
    });
  }
  for (const id of toDelete) {
    batch.delete(doc(db, "trips", tripId, "activities", id));
  }
  await batch.commit();
};

export const subscribeToActivitiesByDate = (
  tripId: string,
  date: string,
  onData: (activities: ActivityWithId[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(
    activitiesRef(tripId),
    where("date", "==", date),
    orderBy("order")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const activities = snapshot.docs.map((d) =>
        toActivityWithId(d.id, d.data())
      );
      onData(activities);
    },
    onError
  );
};
