import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  getAllPaymentHistory,
  getAllSettlementStatuses,
  recordDebtPayment,
  toggleSettlementPaid,
  undoDebtPayment,
} from "@/services/debtService";
import { useAuthStore } from "@/stores/authStore";

import type { PaymentTransaction } from "@/types/payment";

interface UseDebtPaymentsProps {
  tripId: string;
}

/**
 * Hook to manage debt payment operations and history
 * @param tripId - Trip ID to fetch payment history
 * @returns Object with payment history, mutations, and state
 */
export const useDebtPayments = ({ tripId }: UseDebtPaymentsProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<{
    fromName: string;
    toName: string;
    amount: number;
    isPaid?: boolean;
  } | null>(null);

  // Fetch payment history
  const { data: paymentHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["paymentHistory", tripId],
    queryFn: () => getAllPaymentHistory(tripId),
    enabled: !!tripId,
  });

  // Fetch settlement statuses (which debts are marked as paid)
  const {
    data: settlementStatuses = new Map(),
    isLoading: isLoadingSettlements,
  } = useQuery({
    queryKey: ["settlementStatuses", tripId],
    queryFn: () => getAllSettlementStatuses(tripId),
    enabled: !!tripId,
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (
      transaction: Omit<PaymentTransaction, "id" | "createdAt">
    ) => {
      return await recordDebtPayment(tripId, transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentHistory", tripId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] });
    },
  });

  // Undo payment mutation
  const undoPaymentMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return await undoDebtPayment(tripId, transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentHistory", tripId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] });
    },
  });

  // Toggle settlement paid status mutation
  const toggleSettlementMutation = useMutation({
    mutationFn: async (params: {
      fromName: string;
      toName: string;
      isPaid: boolean;
    }) => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }
      return await toggleSettlementPaid(
        tripId,
        params.fromName,
        params.toName,
        params.isPaid,
        user.uid
      );
    },
    onSuccess: () => {
      // Invalidate settlement statuses to refetch from Firestore
      queryClient.invalidateQueries({
        queryKey: ["settlementStatuses", tripId],
      });
      // Also invalidate expenses in case balance calculation is cached
      queryClient.invalidateQueries({ queryKey: ["expenses", tripId] });
    },
  });

  // Handle opening payment modal with settlement status
  const handleOpenPaymentModal = (
    fromName: string,
    toName: string,
    amount: number
  ) => {
    const key = `${fromName}-${toName}`;
    const status = settlementStatuses.get(key);
    const isPaid = status?.isPaid || false;

    setSelectedDebt({ fromName, toName, amount, isPaid });
    setIsPaymentModalOpen(true);
  };

  // Handle payment submission
  const handlePaymentConfirm = async (amountToPay: number, _note?: string) => {
    if (!selectedDebt) return;

    const transaction: Omit<PaymentTransaction, "id" | "createdAt"> = {
      debtId: `${selectedDebt.fromName}-${selectedDebt.toName}`,
      fromName: selectedDebt.fromName,
      toName: selectedDebt.toName,
      amount: amountToPay,
      originalDebtAmount: selectedDebt.amount,
      remainingDebtAmount: Math.max(0, selectedDebt.amount - amountToPay),
      paidAt: new Date(),
      status: "completed",
    };

    await recordPaymentMutation.mutateAsync(transaction);
    setIsPaymentModalOpen(false);
    setSelectedDebt(null);
  };

  // Handle payment undo
  const handleUndoPayment = async (transactionId: string) => {
    await undoPaymentMutation.mutateAsync(transactionId);
  };

  // Handle toggle settlement paid status
  const handleToggleSettlementPaid = async (
    fromName: string,
    toName: string,
    newIsPaidState: boolean
  ) => {
    await toggleSettlementMutation.mutateAsync({
      fromName,
      toName,
      isPaid: newIsPaidState,
    });
  };

  return {
    paymentHistory,
    isLoadingHistory,
    isLoadingSettlements,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    selectedDebt,
    settlementStatuses,
    handleOpenPaymentModal,
    handlePaymentConfirm,
    handleUndoPayment,
    handleToggleSettlementPaid,
    isRecording: recordPaymentMutation.isPending,
    isUndoing: undoPaymentMutation.isPending,
    isTogglingSettlement: toggleSettlementMutation.isPending,
  };
};
