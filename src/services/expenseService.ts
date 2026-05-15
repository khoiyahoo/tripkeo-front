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
  ExpensePaidByType,
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

// ─── 4-case helper ───────────────────────────────────────────
// Case 1: group_fund, all members   → simple, deduct from fund
// Case 2: group_fund, partial       → deduct + refund non-participants
// Case 3: member_shared, all members → fund reimburses the payer
// Case 4: member_shared, partial    → outside the system, no fund impact

export function doesAffectGroupFund(
  paidByType: ExpensePaidByType,
  splitBetweenCount: number,
  totalMembers: number
): boolean {
  if (paidByType === "group_fund") return true; // Case 1 & 2
  if (paidByType === "member_shared" && splitBetweenCount === totalMembers)
    return true; // Case 3
  return false; // Case 4
}

// ─── CRUD ────────────────────────────────────────────────────

export const createExpense = async (
  tripId: string,
  input: CreateExpenseInput,
  userId: string,
  totalMembers: number
): Promise<string> => {
  const expenseData = {
    description: input.description,
    amount: input.amount,
    category: input.category,
    date: Timestamp.fromDate(new Date(input.date)),
    paidBy: input.paidBy,
    splitBetween: input.splitBetween,
    totalMembers,
    affectsGroupFund: doesAffectGroupFund(
      input.paidBy.type,
      input.splitBetween.length,
      totalMembers
    ),
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
  data: Partial<CreateExpenseInput>,
  totalMembers: number
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

  // Always recompute affectsGroupFund + totalMembers on update
  updateData.totalMembers = totalMembers;
  if (data.paidBy && data.splitBetween) {
    updateData.affectsGroupFund = doesAffectGroupFund(
      data.paidBy.type,
      data.splitBetween.length,
      totalMembers
    );
  }
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

// ─── Settlement calculation (4-case model) ───────────────────

export interface SettlementResult {
  groupFundSpent: number;
  totalReimburseToMembers: number;
  totalRefundNonParticipants: number;
  reimburseToMembers: Array<{ uid: string; name: string; amount: number }>;
  refundToNonParticipants: Array<{ uid: string; name: string; amount: number }>;
  fundRemaining: number;
  perPersonReturn: number;
  perPersonOwes: number;
}

export function calculateSettlement(
  expenses: ExpenseWithId[],
  members: Record<string, TripMemberInfo>,
  budgetTotal: number
): SettlementResult {
  const memberIds = Object.keys(members);
  const memberCount = memberIds.length;

  let groupFundSpent = 0;
  let totalReimburseToMembers = 0;

  const refundMap: Record<string, number> = {};
  const reimburseMap: Record<string, number> = {};

  for (const uid of memberIds) {
    refundMap[uid] = 0;
    reimburseMap[uid] = 0;
  }

  for (const exp of expenses) {
    const paidByType = exp.paidBy?.type ?? "group_fund";
    const participantIds = exp.splitBetween ?? [];
    const nonParticipantIds = memberIds.filter(
      (uid) => !participantIds.includes(uid)
    );

    if (paidByType === "group_fund") {
      // Case 1 & 2
      groupFundSpent += exp.amount;

      // Case 2: refund each non-participant their per-capita share
      if (nonParticipantIds.length > 0) {
        const refundPerPerson = exp.amount / memberCount;
        for (const uid of nonParticipantIds) {
          refundMap[uid] = (refundMap[uid] ?? 0) + refundPerPerson;
        }
      }
    }

    if (paidByType === "member_shared") {
      if (participantIds.length === memberCount) {
        // Case 3: fund reimburses the payer
        const payerId = exp.paidBy?.userId;
        if (payerId) {
          reimburseMap[payerId] = (reimburseMap[payerId] ?? 0) + exp.amount;
          totalReimburseToMembers += exp.amount;
        }
      }
      // Case 4: no fund impact — skip
    }
  }

  const totalRefundNonParticipants = Object.values(refundMap).reduce(
    (s, v) => s + v,
    0
  );

  const fundRemaining =
    budgetTotal -
    groupFundSpent -
    totalReimburseToMembers -
    totalRefundNonParticipants;

  const perPersonReturn =
    fundRemaining > 0 && memberCount > 0 ? fundRemaining / memberCount : 0;
  const perPersonOwes =
    fundRemaining < 0 && memberCount > 0
      ? Math.abs(fundRemaining) / memberCount
      : 0;

  const reimburseToMembers = Object.entries(reimburseMap)
    .filter(([, amount]) => amount > 0)
    .map(([uid, amount]) => ({
      uid,
      name: members[uid]?.displayName ?? "Unknown",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const refundToNonParticipants = Object.entries(refundMap)
    .filter(([, amount]) => amount > 0)
    .map(([uid, amount]) => ({
      uid,
      name: members[uid]?.displayName ?? "Unknown",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    groupFundSpent,
    totalReimburseToMembers,
    totalRefundNonParticipants,
    reimburseToMembers,
    refundToNonParticipants,
    fundRemaining,
    perPersonReturn,
    perPersonOwes,
  };
}

// ─── Budget status ───────────────────────────────────────────

export interface BudgetStatus {
  totalGroupSpent: number;
  /** Case-2 refund obligations owed to non-participants */
  totalRefundNonParticipants: number;
  remaining: number; // = budget − totalGroupSpent − totalRefundNonParticipants (matches settlement.fundRemaining)
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
  // Only count fund-affecting expenses (Cases 1, 2, 3)
  let totalGroupSpent = 0;
  // Case 2: group_fund with partial participants → non-participants get their
  // per-capita share refunded from the fund. This is a fund obligation that
  // must be deducted from remaining to match calculateSettlement.fundRemaining.
  let totalRefundNonParticipants = 0;

  for (const e of expenses) {
    const type = e.paidBy?.type ?? "group_fund";
    if (type === "group_fund") {
      totalGroupSpent += e.amount;
      const splitCount = e.splitBetween?.length ?? memberCount;
      const nonParticipants = memberCount - splitCount;
      if (nonParticipants > 0 && memberCount > 0) {
        totalRefundNonParticipants +=
          nonParticipants * (e.amount / memberCount);
      }
    } else if (
      type === "member_shared" &&
      (e.splitBetween?.length ?? 0) === memberCount
    ) {
      totalGroupSpent += e.amount; // Case 3
    }
  }

  const remaining = budgetTotal - totalGroupSpent - totalRefundNonParticipants;
  const percentUsed =
    budgetTotal > 0
      ? ((totalGroupSpent + totalRefundNonParticipants) / budgetTotal) * 100
      : 0;
  const isOverBudget = remaining < 0;
  const isWarning = percentUsed >= 80 && !isOverBudget;
  const collectMore =
    isOverBudget && memberCount > 0 ? Math.abs(remaining) / memberCount : 0;

  return {
    totalGroupSpent,
    totalRefundNonParticipants,
    remaining,
    percentUsed,
    isOverBudget,
    isWarning,
    collectMore,
  };
};

// ─── Per-person balance (for PDF export) ─────────────────────

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

  for (const uid of memberIds) {
    paid[uid] = perPerson;
    owed[uid] = 0;
  }

  // Only consider fund-affecting expenses (exclude Case 4)
  for (const exp of expenses) {
    const paidByType = exp.paidBy?.type ?? "group_fund";
    const participants = exp.splitBetween ?? [];
    const affects = doesAffectGroupFund(
      paidByType,
      participants.length,
      memberCount
    );
    if (!affects) continue;

    const payerId = exp.paidBy?.userId;

    if (
      paidByType === "member_shared" &&
      payerId &&
      paid[payerId] !== undefined
    ) {
      paid[payerId] += exp.amount;
    }

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

export const calculateDebts = (balances: MemberBalance[]): DebtSettlement[] => {
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
