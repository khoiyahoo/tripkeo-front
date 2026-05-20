import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

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
