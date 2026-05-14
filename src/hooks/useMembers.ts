import { useCallback, useEffect, useState } from "react";

import {
  acceptInvitation,
  inviteMember,
  removeMember,
  subscribeToPendingInvitations,
  updateMemberRole,
} from "@/services/memberService";
import { useAuthStore } from "@/stores/authStore";

import type {
  InvitationWithId,
  InviteMemberInput,
  TripRole,
} from "@/types/firestore";

interface UseInvitationsResult {
  pendingInvitations: (InvitationWithId & { tripId: string })[];
  isLoading: boolean;
  handleAcceptInvitation: (
    tripId: string,
    invitationId: string,
    role: "editor" | "viewer"
  ) => Promise<void>;
}

export const useInvitations = (): UseInvitationsResult => {
  const user = useAuthStore((s) => s.user);
  const [pendingInvitations, setPendingInvitations] = useState<
    (InvitationWithId & { tripId: string })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setPendingInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToPendingInvitations(
      user.email,
      (data) => {
        setPendingInvitations(data);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.email]);

  const handleAcceptInvitation = useCallback(
    async (tripId: string, invitationId: string, role: "editor" | "viewer") => {
      if (!user) throw new Error("Not authenticated");
      await acceptInvitation(
        tripId,
        invitationId,
        user.uid,
        user.displayName ?? "",
        user.photoURL ?? "",
        user.email ?? "",
        role
      );
    },
    [user]
  );

  return { pendingInvitations, isLoading, handleAcceptInvitation };
};

interface UseTripMembersResult {
  handleInviteMember: (input: InviteMemberInput) => Promise<string>;
  handleRemoveMember: (userId: string) => Promise<void>;
  handleUpdateRole: (userId: string, newRole: TripRole) => Promise<void>;
}

export const useTripMembers = (
  tripId: string,
  tripName: string,
  destination: string
): UseTripMembersResult => {
  const user = useAuthStore((s) => s.user);

  const handleInviteMember = useCallback(
    (input: InviteMemberInput): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      return inviteMember(
        tripId,
        input,
        user.uid,
        user.displayName ?? "",
        tripName,
        destination
      );
    },
    [tripId, user, tripName, destination]
  );

  const handleRemoveMember = useCallback(
    (userId: string): Promise<void> => {
      return removeMember(tripId, userId);
    },
    [tripId]
  );

  const handleUpdateRole = useCallback(
    (userId: string, newRole: TripRole): Promise<void> => {
      return updateMemberRole(tripId, userId, newRole);
    },
    [tripId]
  );

  return { handleInviteMember, handleRemoveMember, handleUpdateRole };
};
