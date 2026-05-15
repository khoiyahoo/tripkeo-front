import { useMemo } from "react";

import type { TripRole } from "@/types/firestore";

export interface Permissions {
  role: TripRole | undefined;
  canEditItinerary: boolean;
  canEditExpenses: boolean;
  canManageMembers: boolean;
  canInvite: boolean;
  canLeave: boolean;
  isOwner: boolean;
  isEditor: boolean;
  isTreasurer: boolean;
  isMember: boolean;
}

export const usePermissions = (
  currentUserRole: TripRole | undefined
): Permissions => {
  return useMemo(() => {
    const isOwner = currentUserRole === "owner";
    const isEditor = currentUserRole === "editor";
    const isTreasurer = currentUserRole === "treasurer";
    const isMember = currentUserRole === "member";

    return {
      role: currentUserRole,
      canEditItinerary: isOwner || isEditor,
      canEditExpenses: isOwner || isTreasurer,
      canManageMembers: isOwner,
      canInvite: isOwner,
      canLeave: !isOwner && currentUserRole !== undefined,
      isOwner,
      isEditor,
      isTreasurer,
      isMember,
    };
  }, [currentUserRole]);
};
