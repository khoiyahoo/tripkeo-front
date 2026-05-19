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
  SplitMethod,
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

// ─── Active-member helper ─────────────────────────────────────
// (Kept for system-member operations; cost members are now plain strings)

// ─── Cost-member expense constraint check ────────────────────

/**
 * Returns expense info for a given cost-member name.
 * Used to enforce "cannot remove cost member if linked to expenses".
 */
export const getCostMemberExpenseInfo = (
  expenses: ExpenseWithId[],
  name: string
): {
  hasExpenses: boolean;
  asPayer: ExpenseWithId[];
  asParticipant: ExpenseWithId[];
} => {
  const asPayer = expenses.filter((e) => e.paidBy === name);
  const asParticipant = expenses.filter(
    (e) => e.splitBetween.includes(name) && e.paidBy !== name
  );
  return {
    hasExpenses: asPayer.length > 0 || asParticipant.length > 0,
    asPayer,
    asParticipant,
  };
};

// ─── Split calculation ───────────────────────────────────────

/**
 * Given an expense, returns a map of uid → amount owed by each participant.
 */
export function getOwedPerPerson(
  amount: number,
  splitBetween: string[],
  splitMethod: SplitMethod,
  splitDetails?: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  if (splitBetween.length === 0) return result;

  switch (splitMethod) {
    case "equal": {
      const share = amount / splitBetween.length;
      for (const uid of splitBetween) result[uid] = share;
      break;
    }
    case "percentage": {
      for (const uid of splitBetween) {
        const pct = splitDetails?.[uid] ?? 0;
        result[uid] = (amount * pct) / 100;
      }
      break;
    }
    case "amount": {
      for (const uid of splitBetween) {
        result[uid] = splitDetails?.[uid] ?? 0;
      }
      break;
    }
    case "shares": {
      const totalShares = splitBetween.reduce(
        (sum, uid) => sum + (splitDetails?.[uid] ?? 1),
        0
      );
      if (totalShares === 0) break;
      for (const uid of splitBetween) {
        const shares = splitDetails?.[uid] ?? 1;
        result[uid] = (amount * shares) / totalShares;
      }
      break;
    }
  }

  return result;
}

// ─── CRUD ────────────────────────────────────────────────────

export const createExpense = async (
  tripId: string,
  input: CreateExpenseInput,
  userId: string
): Promise<string> => {
  const expenseData: Omit<ExpenseDoc, "createdAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
  } = {
    description: input.description,
    amount: input.amount,
    category: input.category,
    date: Timestamp.fromDate(new Date(input.date)),
    paidBy: input.paidBy,
    splitBetween: input.splitBetween,
    splitMethod: input.splitMethod,
    splitDetails: input.splitDetails ?? {},
    receiptUrl: input.receiptUrl ?? "",
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
  if (data.date !== undefined)
    updateData.date = Timestamp.fromDate(new Date(data.date));
  if (data.paidBy !== undefined) updateData.paidBy = data.paidBy;
  if (data.splitBetween !== undefined)
    updateData.splitBetween = data.splitBetween;
  if (data.splitMethod !== undefined) updateData.splitMethod = data.splitMethod;
  if (data.splitDetails !== undefined)
    updateData.splitDetails = data.splitDetails;
  if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
  if (data.note !== undefined) updateData.note = data.note;

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

// ─── Per-person balance ──────────────────────────────────────

/**
 * Calculates balances for cost members (name-based, not UID-based).
 * @param expenses - all expenses in the trip
 * @param costMembers - names entered by the owner (e.g. ["Minh", "Hương"])
 */
export const calculateBalances = (
  expenses: ExpenseWithId[],
  costMembers: string[]
): MemberBalance[] => {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};

  for (const name of costMembers) {
    paid[name] = 0;
    owed[name] = 0;
  }

  for (const exp of expenses) {
    const payer = exp.paidBy;
    if (paid[payer] !== undefined) {
      paid[payer] += exp.amount;
    }

    const owedMap = getOwedPerPerson(
      exp.amount,
      exp.splitBetween ?? [],
      exp.splitMethod ?? "equal",
      exp.splitDetails
    );

    for (const [name, share] of Object.entries(owedMap)) {
      if (owed[name] !== undefined) {
        owed[name] += share;
      }
    }
  }

  return costMembers.map((name) => ({
    name,
    totalPaid: paid[name] ?? 0,
    totalOwed: owed[name] ?? 0,
    net: (paid[name] ?? 0) - (owed[name] ?? 0),
  }));
};

// ─── Settlement: minimize transactions ───────────────────────

export const calculateDebts = (balances: MemberBalance[]): DebtSettlement[] => {
  const creditors = balances
    .filter((b) => b.net > 0.5)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  const debtors = balances
    .filter((b) => b.net < -0.5)
    .map((b) => ({ ...b, net: Math.abs(b.net) }))
    .sort((a, b) => b.net - a.net);

  const settlements: DebtSettlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].net, debtors[di].net);
    if (amount > 0.5) {
      settlements.push({
        fromName: debtors[di].name,
        toName: creditors[ci].name,
        amount: Math.round(amount),
      });
    }
    creditors[ci].net -= amount;
    debtors[di].net -= amount;

    if (creditors[ci].net < 0.5) ci++;
    if (debtors[di].net < 0.5) di++;
  }

  return settlements;
};

// ─── Summary stats ───────────────────────────────────────────

export interface ExpenseSummary {
  totalSpent: number;
  expenseCount: number;
  dateRangeDays: number;
}

export const getExpenseSummary = (
  expenses: ExpenseWithId[]
): ExpenseSummary => {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseCount = expenses.length;

  let dateRangeDays = 0;
  if (expenses.length > 0) {
    const dates = expenses
      .map((e) => {
        if (
          e.date &&
          typeof (e.date as unknown as { toDate: () => Date }).toDate ===
            "function"
        ) {
          return (e.date as unknown as { toDate: () => Date })
            .toDate()
            .getTime();
        }
        return 0;
      })
      .filter((d) => d > 0);

    if (dates.length > 0) {
      const min = Math.min(...dates);
      const max = Math.max(...dates);
      dateRangeDays = Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  return { totalSpent, expenseCount, dateRangeDays };
};

// ─── Member-expense relationship check ───────────────────────

// getMemberExpenseInfo by UID is no longer needed since expenses are name-based.
// Use getCostMemberExpenseInfo(expenses, name) instead.
