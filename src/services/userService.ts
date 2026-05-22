import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import {
  collection,
  collectionGroup,
  deleteDoc,
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
/**
 * Deletes a trip document along with all its subcollections.
 * Subcollections: activities, expenses, invitations, personalActivities.
 * Firestore has no server-side cascade-delete from the client SDK, so each
 * subcollection's documents must be fetched and deleted in batches.
 */
const deleteTripWithSubcollections = async (tripId: string): Promise<void> => {
  const subcollections = [
    "activities",
    "expenses",
    "invitations",
    "personalActivities",
  ];

  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, "trips", tripId, sub));
    if (!snap.empty) {
      const batch = writeBatch(db);
      for (const d of snap.docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, "trips", tripId));
};

/**
 * Delete all Firestore data associated with the user:
 *
 * - Trips the user **owns** (createdBy == userId) → deleted entirely (subcollections included).
 * - Trips the user **joined** (member/treasurer) → membership soft-deleted (status = "deleted").
 * - Pending invitations addressed to the user's email → cancelled.
 * - User profile document → deleted.
 *
 * Call this BEFORE deleting the Firebase Auth account.
 */
export const deleteUserData = async (
  userId: string,
  userEmail: string
): Promise<void> => {
  // 1. Fetch all trips the user belongs to
  const tripsSnap = await getDocs(
    query(collection(db, "trips"), where("memberIds", "array-contains", userId))
  );

  const ownedTrips = tripsSnap.docs.filter(
    (d) => d.data().createdBy === userId
  );
  const memberTrips = tripsSnap.docs.filter(
    (d) => d.data().createdBy !== userId
  );

  // 2. Hard-delete trips the user created (with all subcollections)
  for (const tripDoc of ownedTrips) {
    await deleteTripWithSubcollections(tripDoc.id);
  }

  // 3. Soft-delete the user's membership from trips they only joined
  if (memberTrips.length > 0) {
    const memberBatch = writeBatch(db);
    for (const tripDoc of memberTrips) {
      memberBatch.update(tripDoc.ref, {
        [`members.${userId}.status`]: "deleted",
        [`members.${userId}.deletedAt`]: serverTimestamp(),
      });
    }
    await memberBatch.commit();
  }

  // 4. Cancel pending invitations addressed to this user's email
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

  // 5. Delete the user profile document last
  await deleteDoc(doc(db, "users", userId));
};
