import {
  addDoc,
  arrayRemove,
  arrayUnion,
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

import { getAppUrl } from "@/lib/appUrl";
import { db } from "@/lib/firebase";
import { sendInviteEmail } from "@/services/emailService";
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

  // Tên chủ chuyến là người chia chi phí đầu tiên (loại trùng)
  const initialCostMembers = Array.from(
    new Set([userDisplayName, ...(input.costMembers ?? [])])
  );

  const docRef = await addDoc(collection(db, TRIPS_COLLECTION), {
    name: input.name,
    destination: input.destination,
    coverImage: input.coverImage,
    startDate: Timestamp.fromDate(new Date(input.startDate)),
    endDate: Timestamp.fromDate(new Date(input.endDate)),
    description: input.description ?? "",
    currency: input.currency,
    createdBy: userId,
    memberIds: [userId],
    members: { [userId]: memberInfo },
    costMembers: initialCostMembers,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.invitedMembers && input.invitedMembers.length > 0) {
    await Promise.all(
      input.invitedMembers.map(async (member) => {
        const inviteCode = await inviteMember(
          docRef.id,
          { email: member.email, role: member.role },
          userId,
          userDisplayName,
          input.name,
          input.destination
        );
        try {
          await sendInviteEmail({
            toEmail: member.email,
            fromName: userDisplayName,
            tripName: input.name,
            role: member.role,
            inviteLink: `${getAppUrl()}/invite/${inviteCode}`,
          });
        } catch {
          // Gửi email lỗi nhưng lời mời đã được tạo
        }
      })
    );
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
      onData(snapshot.docs.map((d) => toTripWithId(d.id, d.data())));
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

// ─── Cost Members ─────────────────────────────────────────────

export const addCostMember = async (
  tripId: string,
  name: string
): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId), {
    costMembers: arrayUnion(name.trim()),
    updatedAt: serverTimestamp(),
  });
};

export const removeCostMember = async (
  tripId: string,
  name: string
): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId), {
    costMembers: arrayRemove(name),
    updatedAt: serverTimestamp(),
  });
};
