import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  InvitationDoc,
  InvitationWithId,
  InviteMemberInput,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

const invitationsRef = (tripId: string) =>
  collection(db, "trips", tripId, "invitations");

const generateInviteCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return code;
};

export const inviteMember = async (
  tripId: string,
  input: InviteMemberInput,
  invitedByUid: string,
  invitedByName: string,
  tripName: string,
  destination: string
): Promise<string> => {
  const invitationData: Omit<InvitationDoc, "createdAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
  } = {
    email: input.email,
    role: input.role,
    inviteCode: generateInviteCode(),
    status: "pending",
    invitedBy: invitedByUid,
    invitedByName,
    tripName,
    destination,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(invitationsRef(tripId), invitationData);
  return docRef.id;
};

export const acceptInvitation = async (
  tripId: string,
  invitationId: string,
  userId: string,
  userDisplayName: string,
  userPhotoURL: string,
  userEmail: string,
  role: "editor" | "viewer"
): Promise<void> => {
  const memberInfo: TripMemberInfo = {
    role,
    displayName: userDisplayName,
    photoURL: userPhotoURL,
    email: userEmail,
    joinedAt: Timestamp.now(),
  };

  const tripRef = doc(db, "trips", tripId);

  await updateDoc(tripRef, {
    [`members.${userId}`]: memberInfo,
    memberIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "trips", tripId, "invitations", invitationId), {
    status: "accepted",
  });
};

export const removeMember = async (
  tripId: string,
  userId: string
): Promise<void> => {
  const tripRef = doc(db, "trips", tripId);

  await updateDoc(tripRef, {
    [`members.${userId}`]: deleteField(),
    memberIds: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
};

export const updateMemberRole = async (
  tripId: string,
  userId: string,
  newRole: TripRole
): Promise<void> => {
  await updateDoc(doc(db, "trips", tripId), {
    [`members.${userId}.role`]: newRole,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToPendingInvitations = (
  email: string,
  onData: (invitations: (InvitationWithId & { tripId: string })[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(
    collectionGroup(db, "invitations"),
    where("email", "==", email),
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const invitations = snapshot.docs.map((d) => ({
        id: d.id,
        tripId: d.ref.parent.parent?.id ?? "",
        ...(d.data() as InvitationDoc),
      }));
      onData(invitations);
    },
    onError
  );
};

export const subscribeToTripInvitations = (
  tripId: string,
  onData: (invitations: InvitationWithId[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(invitationsRef(tripId), where("status", "==", "pending"));

  return onSnapshot(
    q,
    (snapshot) => {
      const invitations = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as InvitationDoc),
      }));
      onData(invitations);
    },
    onError
  );
};
