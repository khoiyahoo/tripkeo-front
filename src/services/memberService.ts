import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  getDocs,
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
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

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
    expiresAt,
    createdAt: serverTimestamp(),
  };

  await addDoc(invitationsRef(tripId), invitationData);
  return invitationData.inviteCode;
};

export const acceptInvitation = async (
  tripId: string,
  invitationId: string,
  userId: string,
  userDisplayName: string,
  userPhotoURL: string,
  userEmail: string,
  role: "treasurer" | "editor" | "member"
): Promise<void> => {
  const memberInfo: TripMemberInfo = {
    role,
    displayName: userDisplayName,
    photoURL: userPhotoURL,
    email: userEmail,
    joinedAt: Timestamp.now(),
    status: "active",
    participationStart: new Date().toISOString().split("T")[0],
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
  const today = new Date().toISOString().split("T")[0];

  // Soft-delete: keep member record for expense history, just mark as removed
  await updateDoc(tripRef, {
    [`members.${userId}.status`]: "removed",
    [`members.${userId}.participationEnd`]: today,
    memberIds: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
};

export const leaveTrip = async (
  tripId: string,
  userId: string,
  participationEnd?: string
): Promise<void> => {
  const tripRef = doc(db, "trips", tripId);
  const endDate = participationEnd ?? new Date().toISOString().split("T")[0];

  // Soft-delete: keep member record for expense history, just mark as left
  await updateDoc(tripRef, {
    [`members.${userId}.status`]: "left",
    [`members.${userId}.participationEnd`]: endDate,
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

/** Find an invitation by its invite code across all trip subcollections */
export const findInvitationByCode = async (
  inviteCode: string
): Promise<(InvitationWithId & { tripId: string }) | null> => {
  const q = query(
    collectionGroup(db, "invitations"),
    where("inviteCode", "==", inviteCode),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const d = snapshot.docs[0];
  const tripId = d.ref.parent.parent?.id ?? "";
  return { id: d.id, tripId, ...(d.data() as InvitationDoc) };
};

/** Decline an invitation */
export const declineInvitation = async (
  tripId: string,
  invitationId: string
): Promise<void> => {
  await updateDoc(doc(db, "trips", tripId, "invitations", invitationId), {
    status: "declined",
  });
};

/** Check if a pending invitation already exists for this email on this trip */
export const checkDuplicateInvitation = async (
  tripId: string,
  email: string
): Promise<InvitationWithId | null> => {
  const q = query(
    invitationsRef(tripId),
    where("email", "==", email),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...(d.data() as InvitationDoc) };
};

/** Create a share-link invitation (no email sent) and return the invite code */
export const createShareLinkInvitation = async (
  tripId: string,
  role: "treasurer" | "editor" | "member",
  invitedByUid: string,
  invitedByName: string,
  tripName: string,
  destination: string
): Promise<string> => {
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const inviteCode = generateInviteCode();

  const invitationData: Omit<InvitationDoc, "createdAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
  } = {
    email: "",
    role,
    inviteCode,
    status: "pending",
    invitedBy: invitedByUid,
    invitedByName,
    tripName,
    destination,
    expiresAt,
    createdAt: serverTimestamp(),
  };

  await addDoc(invitationsRef(tripId), invitationData);
  return inviteCode;
};
