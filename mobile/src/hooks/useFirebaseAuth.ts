import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";

import { auth } from "@/lib/firebase";
import { saveUserProfile } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";

export const useFirebaseAuth = (): void => {
  const setUser = useAuthStore((s) => s.setUser);
  const setIsInitialized = useAuthStore((s) => s.setIsInitialized);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsInitialized(true);
      if (user) saveUserProfile(user).catch(() => null);
    });
  }, [setUser, setIsInitialized]);
};
