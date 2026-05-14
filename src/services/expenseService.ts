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
    splitType: input.splitType,
    splitAmong: input.splitAmong,
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
  if (data.splitType !== undefined) updateData.splitType = data.splitType;
  if (data.splitAmong !== undefined) updateData.splitAmong = data.splitAmong;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.date !== undefined)
    updateData.date = Timestamp.fromDate(new Date(data.date));

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

export const calculateBalances = (
  expenses: ExpenseWithId[],
  members: Record<string, TripMemberInfo>
): MemberBalance[] => {
  const balanceMap: Record<string, { totalPaid: number; totalOwed: number }> =
    {};

  // Initialize all members
  for (const uid of Object.keys(members)) {
    balanceMap[uid] = { totalPaid: 0, totalOwed: 0 };
  }

  // Calculate from expenses
  for (const expense of expenses) {
    const paidBy =
      typeof expense.paidBy === "string"
        ? { type: "member" as const, userId: expense.paidBy, displayName: "" }
        : expense.paidBy;

    // group_fund expenses: no individual balance change
    if (paidBy.type === "group_fund") continue;

    // member-paid: add to payer's totalPaid
    const payerId = paidBy.userId;
    if (payerId && balanceMap[payerId]) {
      balanceMap[payerId].totalPaid += expense.amount;
    }

    // Add to each person's totalOwed
    for (const [uid, amount] of Object.entries(expense.splitAmong)) {
      if (balanceMap[uid]) {
        balanceMap[uid].totalOwed += amount;
      }
    }
  }

  return Object.entries(balanceMap).map(([uid, { totalPaid, totalOwed }]) => ({
    uid,
    displayName: members[uid]?.displayName ?? "Unknown",
    photoURL: members[uid]?.photoURL ?? "",
    totalPaid,
    totalOwed,
    net: totalPaid - totalOwed,
  }));
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
