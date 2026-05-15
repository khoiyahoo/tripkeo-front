import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  CreateExpenseInput,
  DebtSettlement,
  ExpenseDoc,
  ExpenseWithId,
  MemberBalance,
  TripMemberInfo,
} from "@/types/firestore";

const expensesRef = (tripId: string) =>
  collection(db, "trips", tripId, "expenses");

const toExpenseWithId = (
  id: string,
  data: Record<string, unknown>
): ExpenseWithId => ({
  id,
  ...(data as unknown as ExpenseDoc),
});

export const createExpense = async (
  tripId: string,
  input: CreateExpenseInput,
  userId: string
): Promise<string> => {
  const expenseData = {
    description: input.description,
    amount: input.amount,
    category: input.category,
    date: Timestamp.fromDate(new Date(input.date)),
    paidBy: input.paidBy,
    splitBetween: input.splitBetween,
    note: input.note ?? "",
    createdBy: userId,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(expensesRef(tripId), expenseData);
  return docRef.id;
};

export const updateExpense = async (
  tripId: string,
  expenseId: string,
  data: Partial<CreateExpenseInput>
): Promise<void> => {
  const updateData: Record<string, unknown> = {};

  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.paidBy !== undefined) updateData.paidBy = data.paidBy;
  if (data.splitBetween !== undefined)
    updateData.splitBetween = data.splitBetween;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.date !== undefined)
    updateData.date = Timestamp.fromDate(new Date(data.date));
  updateData.updatedAt = serverTimestamp();

  await updateDoc(doc(db, "trips", tripId, "expenses", expenseId), updateData);
};

export const deleteExpense = async (
  tripId: string,
  expenseId: string
): Promise<void> => {
  await deleteDoc(doc(db, "trips", tripId, "expenses", expenseId));
};

export const subscribeToExpenses = (
  tripId: string,
  onData: (expenses: ExpenseWithId[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(expensesRef(tripId), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const expenses = snapshot.docs.map((d) =>
        toExpenseWithId(d.id, d.data())
      );
      onData(expenses);
    },
    onError
  );
};

// ─── Balance calculation ─────────────────────────────────────

/**
 * Calculate balances per the spec:
 * - Everyone contributed `budgetTotal / memberCount` upfront
 * - group_fund: deducted from group budget, split among participants
 * - member_shared: member paid out-of-pocket, split among participants
 * - member_personal: member paid for themselves only
 * - net positive = get refund, net negative = owe more
 */
export const calculateBalances = (
  expenses: ExpenseWithId[],
  members: Record<string, TripMemberInfo>,
  budgetTotal: number
): MemberBalance[] => {
  const memberIds = Object.keys(members);
  const memberCount = memberIds.length;
  const perPerson = memberCount > 0 ? budgetTotal / memberCount : 0;

  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};

  // Everyone contributed equally upfront
  for (const uid of memberIds) {
    paid[uid] = perPerson;
    owed[uid] = 0;
  }

  for (const exp of expenses) {
    const paidByType = exp.paidBy?.type ?? "group_fund";
    const payerId = exp.paidBy?.userId;

    // Personal: only payer bears cost
    if (paidByType === "member_personal") {
      if (payerId && paid[payerId] !== undefined) {
        paid[payerId] += exp.amount;
        owed[payerId] += exp.amount;
      }
      continue;
    }

    // Member shared: credit the out-of-pocket payer
    if (
      paidByType === "member_shared" &&
      payerId &&
      paid[payerId] !== undefined
    ) {
      paid[payerId] += exp.amount;
    }

    // Split cost among participants (group_fund + member_shared)
    const participants = exp.splitBetween ?? [];
    const share =
      participants.length > 0 ? exp.amount / participants.length : 0;
    for (const uid of participants) {
      if (owed[uid] !== undefined) {
        owed[uid] += share;
      }
    }
  }

  return memberIds.map((uid) => ({
    uid,
    displayName: members[uid]?.displayName ?? "Unknown",
    photoURL: members[uid]?.photoURL ?? "",
    totalPaid: paid[uid] ?? 0,
    totalOwed: owed[uid] ?? 0,
    net: (paid[uid] ?? 0) - (owed[uid] ?? 0),
  }));
};

/**
 * Budget status: how much spent from group fund, remaining, and per-person
 * collection amount if over budget.
 */
export interface BudgetStatus {
  totalGroupSpent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  isWarning: boolean; // > 80%
  collectMore: number; // per person, if over budget
}

export const getBudgetStatus = (
  expenses: ExpenseWithId[],
  budgetTotal: number,
  memberCount: number
): BudgetStatus => {
  const totalGroupSpent = expenses
    .filter((e) => e.paidBy?.type !== "member_personal")
    .reduce((sum, e) => sum + e.amount, 0);

  const remaining = budgetTotal - totalGroupSpent;
  const percentUsed =
    budgetTotal > 0 ? (totalGroupSpent / budgetTotal) * 100 : 0;
  const isOverBudget = remaining < 0;
  const isWarning = percentUsed >= 80 && !isOverBudget;
  const collectMore =
    isOverBudget && memberCount > 0 ? Math.abs(remaining) / memberCount : 0;

  return {
    totalGroupSpent,
    remaining,
    percentUsed,
    isOverBudget,
    isWarning,
    collectMore,
  };
};

export const calculateDebts = (balances: MemberBalance[]): DebtSettlement[] => {
  // Separate into creditors (net > 0) and debtors (net < 0)
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ ...b, net: Math.abs(b.net) }))
    .sort((a, b) => b.net - a.net);

  const settlements: DebtSettlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].net, debtors[di].net);
    if (amount > 0) {
      settlements.push({
        fromUid: debtors[di].uid,
        fromName: debtors[di].displayName,
        toUid: creditors[ci].uid,
        toName: creditors[ci].displayName,
        amount: Math.round(amount),
      });
    }
    creditors[ci].net -= amount;
    debtors[di].net -= amount;

    if (creditors[ci].net < 1) ci++;
    if (debtors[di].net < 1) di++;
  }

  return settlements;
};
