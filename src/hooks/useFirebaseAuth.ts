import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";

import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

export const useFirebaseAuth = (): void => {
  const setUser = useAuthStore((s) => s.setUser);
  const setIsInitialized = useAuthStore((s) => s.setIsInitialized);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsInitialized(true);
    });

    return unsubscribe;
  }, [setUser, setIsInitialized]);
};
