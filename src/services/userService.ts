import type { User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";

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
