import { useCallback, useEffect, useMemo, useState } from "react";

import {
  calculateBalances,
  calculateDebts,
  createExpense,
  deleteExpense,
  type ExpenseSummary,
  getExpenseSummary,
  subscribeToExpenses,
  updateExpense,
} from "@/services/expenseService";
import { useAuthStore } from "@/stores/authStore";

import type {
  CreateExpenseInput,
  DebtSettlement,
  ExpenseWithId,
  MemberBalance,
} from "@/types/firestore";

interface UseExpensesResult {
  expenses: ExpenseWithId[];
  summary: ExpenseSummary;
  balances: MemberBalance[];
  debts: DebtSettlement[];
  isLoading: boolean;
  error: string | null;
  handleAddExpense: (input: CreateExpenseInput) => Promise<string>;
  handleUpdateExpense: (
    expenseId: string,
    data: Partial<CreateExpenseInput>
  ) => Promise<void>;
  handleDeleteExpense: (expenseId: string) => Promise<void>;
}

export const useExpenses = (
  tripId: string,
  costMembers: string[]
): UseExpensesResult => {
  const user = useAuthStore((s) => s.user);
  const [expenses, setExpenses] = useState<ExpenseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToExpenses(
      tripId,
      (data) => {
        setExpenses(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [tripId]);

  const summary = useMemo(() => getExpenseSummary(expenses), [expenses]);

  const balances = useMemo(
    () => calculateBalances(expenses, costMembers),
    [expenses, costMembers]
  );

  const debts = useMemo(() => calculateDebts(balances), [balances]);

  const handleAddExpense = useCallback(
    (input: CreateExpenseInput): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      return createExpense(tripId, input, user.uid);
    },
    [tripId, user]
  );

  const handleUpdateExpense = useCallback(
    (expenseId: string, data: Partial<CreateExpenseInput>): Promise<void> => {
      return updateExpense(tripId, expenseId, data);
    },
    [tripId]
  );

  const handleDeleteExpense = useCallback(
    (expenseId: string): Promise<void> => {
      return deleteExpense(tripId, expenseId);
    },
    [tripId]
  );

  return {
    expenses,
    summary,
    balances,
    debts,
    isLoading,
    error,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
  };
};
