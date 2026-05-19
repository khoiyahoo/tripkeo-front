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

// ─── Active-member helper ─────────────────────────────────────

/** Returns only members with status "active" (or undefined, for legacy records). */
export const getActiveMembers = (
  members: Record<string, TripMemberInfo>
): Record<string, TripMemberInfo> =>
  Object.fromEntries(
    Object.entries(members).filter(
      ([, m]) => (m.status ?? "active") === "active"
    )
  );

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
    paidByUid: input.paidByUid,
    paidByName: input.paidByName,
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
  if (data.paidByUid !== undefined) updateData.paidByUid = data.paidByUid;
  if (data.paidByName !== undefined) updateData.paidByName = data.paidByName;
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

export const calculateBalances = (
  expenses: ExpenseWithId[],
  members: Record<string, TripMemberInfo>
): MemberBalance[] => {
  const memberIds = Object.keys(members);

  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};

  for (const uid of memberIds) {
    paid[uid] = 0;
    owed[uid] = 0;
  }

  for (const exp of expenses) {
    const payerUid = exp.paidByUid;
    if (paid[payerUid] !== undefined) {
      paid[payerUid] += exp.amount;
    }

    const owedMap = getOwedPerPerson(
      exp.amount,
      exp.splitBetween ?? [],
      exp.splitMethod ?? "equal",
      exp.splitDetails
    );

    for (const [uid, share] of Object.entries(owedMap)) {
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
        fromUid: debtors[di].uid,
        fromName: debtors[di].displayName,
        toUid: creditors[ci].uid,
        toName: creditors[ci].displayName,
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

export interface MemberExpenseInfo {
  hasExpenses: boolean;
  asPayer: ExpenseWithId[];
  asParticipant: ExpenseWithId[];
}

/** Check if a member is linked to any expenses (as payer or participant). */
export const getMemberExpenseInfo = (
  expenses: ExpenseWithId[],
  memberUid: string
): MemberExpenseInfo => {
  const asPayer = expenses.filter((e) => e.paidByUid === memberUid);
  const asParticipant = expenses.filter(
    (e) => e.splitBetween?.includes(memberUid) && e.paidByUid !== memberUid
  );
  return {
    hasExpenses: asPayer.length > 0 || asParticipant.length > 0,
    asPayer,
    asParticipant,
  };
};
