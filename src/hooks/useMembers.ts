import { useCallback, useEffect, useState } from "react";

import { sendInviteEmail } from "@/services/emailService";
import {
  acceptInvitation,
  checkDuplicateInvitation,
  createShareLinkInvitation,
  declineInvitation,
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
  handleDeclineInvitation: (
    tripId: string,
    invitationId: string
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

  const handleDeclineInvitation = useCallback(
    async (tripId: string, invitationId: string) => {
      await declineInvitation(tripId, invitationId);
    },
    []
  );

  return {
    pendingInvitations,
    isLoading,
    handleAcceptInvitation,
    handleDeclineInvitation,
  };
};

interface UseTripMembersResult {
  handleInviteMember: (input: InviteMemberInput) => Promise<string>;
  handleRemoveMember: (userId: string) => Promise<void>;
  handleUpdateRole: (userId: string, newRole: TripRole) => Promise<void>;
  handleCheckDuplicate: (email: string) => Promise<InvitationWithId | null>;
  handleCreateShareLink: (role: "editor" | "viewer") => Promise<string>;
}

export const useTripMembers = (
  tripId: string,
  tripName: string,
  destination: string
): UseTripMembersResult => {
  const user = useAuthStore((s) => s.user);

  const handleInviteMember = useCallback(
    async (input: InviteMemberInput): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      const inviteCode = await inviteMember(
        tripId,
        input,
        user.uid,
        user.displayName ?? "",
        tripName,
        destination
      );

      const appUrl = window.location.origin;
      try {
        await sendInviteEmail({
          toEmail: input.email,
          fromName: user.displayName ?? "Người dùng TripKeo",
          tripName,
          role: input.role,
          inviteLink: `${appUrl}/invite/${inviteCode}`,
        });
      } catch {
        // Email failed but invitation doc was created — user can still share link
      }

      return inviteCode;
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

  const handleCheckDuplicate = useCallback(
    (email: string): Promise<InvitationWithId | null> => {
      return checkDuplicateInvitation(tripId, email);
    },
    [tripId]
  );

  const handleCreateShareLink = useCallback(
    (role: "editor" | "viewer"): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      return createShareLinkInvitation(
        tripId,
        role,
        user.uid,
        user.displayName ?? "",
        tripName,
        destination
      );
    },
    [tripId, user, tripName, destination]
  );

  return {
    handleInviteMember,
    handleRemoveMember,
    handleUpdateRole,
    handleCheckDuplicate,
    handleCreateShareLink,
  };
};
