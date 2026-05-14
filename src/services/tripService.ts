import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { inviteMember } from "@/services/memberService";

import type {
  CreateTripInput,
  TripDoc,
  TripMemberInfo,
  TripWithId,
} from "@/types/firestore";

const TRIPS_COLLECTION = "trips";

const toTripWithId = (
  id: string,
  data: Record<string, unknown>
): TripWithId => ({
  id,
  ...(data as unknown as TripDoc),
});

export const createTrip = async (
  input: CreateTripInput,
  userId: string,
  userDisplayName: string,
  userPhotoURL: string,
  userEmail: string
): Promise<string> => {
  const memberInfo: TripMemberInfo = {
    role: "owner",
    displayName: userDisplayName,
    photoURL: userPhotoURL,
    email: userEmail,
    joinedAt: Timestamp.now(),
  };

  const tripData: Omit<TripDoc, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    name: input.name,
    destination: input.destination,
    coverImage: input.coverImage,
    startDate: Timestamp.fromDate(new Date(input.startDate)),
    endDate: Timestamp.fromDate(new Date(input.endDate)),
    description: input.description ?? "",
    budget: input.budget,
    currency: input.currency,
    createdBy: userId,
    memberIds: [userId],
    members: { [userId]: memberInfo },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, TRIPS_COLLECTION), tripData);

  // Send invitations to invited emails
  if (input.invitedEmails && input.invitedEmails.length > 0) {
    const invitePromises = input.invitedEmails.map((email) =>
      inviteMember(
        docRef.id,
        { email, role: "editor" },
        userId,
        userDisplayName,
        input.name,
        input.destination
      )
    );
    await Promise.all(invitePromises);
  }

  return docRef.id;
};

export const getTrip = async (tripId: string): Promise<TripWithId | null> => {
  const docSnap = await getDoc(doc(db, TRIPS_COLLECTION, tripId));
  if (!docSnap.exists()) return null;
  return toTripWithId(docSnap.id, docSnap.data());
};

export const updateTrip = async (
  tripId: string,
  data: Partial<CreateTripInput>
): Promise<void> => {
  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.destination !== undefined) updateData.destination = data.destination;
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.startDate !== undefined)
    updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
  if (data.endDate !== undefined)
    updateData.endDate = Timestamp.fromDate(new Date(data.endDate));

  await updateDoc(doc(db, TRIPS_COLLECTION, tripId), updateData);
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId));
};

export const subscribeToUserTrips = (
  userId: string,
  onData: (trips: TripWithId[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(
    collection(db, TRIPS_COLLECTION),
    where("memberIds", "array-contains", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const trips = snapshot.docs.map((d) => toTripWithId(d.id, d.data()));
      onData(trips);
    },
    onError
  );
};

export const subscribeToTrip = (
  tripId: string,
  onData: (trip: TripWithId | null) => void,
  onError: (error: Error) => void
): (() => void) => {
  return onSnapshot(
    doc(db, TRIPS_COLLECTION, tripId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(toTripWithId(snapshot.id, snapshot.data()));
    },
    onError
  );
};
