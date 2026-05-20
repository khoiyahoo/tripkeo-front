import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export const saveUserProfile = async (user: User): Promise<void> => {
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/**
 * Update the user's display name in Firebase Auth and their Firestore profile.
 * Note: denormalized displayName in trip member records is NOT updated here
 * to avoid fan-out writes; those records will reflect the old name until next join.
 */
export const updateDisplayName = async (
  userId: string,
  newName: string
): Promise<void> => {
  if (!auth.currentUser) throw new Error("Not authenticated");

  await updateProfile(auth.currentUser, { displayName: newName });

  await updateDoc(doc(db, "users", userId), {
    displayName: newName,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete all Firestore data associated with the user:
 * - User profile document
 * - Removes the user from any trip member lists (soft-delete status = "deleted")
 * - Cancels all pending invitations sent to the user's email
 *
 * Call this BEFORE deleting the Firebase Auth account.
 */
export const deleteUserData = async (
  userId: string,
  userEmail: string
): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Delete user profile document
  batch.delete(doc(db, "users", userId));

  await batch.commit();

  // 2. Cancel pending invitations addressed to this user's email
  //    (collectionGroup query across all trips)
  const invitationsQuery = query(
    collectionGroup(db, "invitations"),
    where("email", "==", userEmail),
    where("status", "==", "pending")
  );
  const invitationSnap = await getDocs(invitationsQuery);
  if (!invitationSnap.empty) {
    const invBatch = writeBatch(db);
    for (const invDoc of invitationSnap.docs) {
      invBatch.update(invDoc.ref, { status: "cancelled" });
    }
    await invBatch.commit();
  }

  // 3. Find trips where this user is a member and soft-delete their membership
  const tripsSnap = await getDocs(
    query(collection(db, "trips"), where("memberIds", "array-contains", userId))
  );
  if (!tripsSnap.empty) {
    const tripBatch = writeBatch(db);
    for (const tripDoc of tripsSnap.docs) {
      tripBatch.update(tripDoc.ref, {
        [`members.${userId}.status`]: "deleted",
      });
    }
    await tripBatch.commit();
  }
};
