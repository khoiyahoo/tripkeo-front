import {
  addDoc,
  collection,
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
  CreateFundTransactionInput,
  FundTransactionDoc,
  FundTransactionWithId,
} from "@/types/firestore";

const txRef = (tripId: string) =>
  collection(db, "trips", tripId, "fundTransactions");

const tripRef = (tripId: string) => doc(db, "trips", tripId);

const assertPositiveInteger = (amount: number): void => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Số tiền phải là số nguyên dương");
  }
};

// ─── Giao dịch quỹ (thu / hoàn) ──────────────────────────────

export const subscribeToFundTransactions = (
  tripId: string,
  onData: (transactions: FundTransactionWithId[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(txRef(tripId), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as FundTransactionDoc),
        }))
      ),
    onError
  );
};

export const createFundTransaction = async (
  tripId: string,
  input: CreateFundTransactionInput,
  userId: string
): Promise<string> => {
  assertPositiveInteger(input.amount);
  if (!input.member.trim()) throw new Error("Thiếu tên thành viên");

  const data: Record<string, unknown> = {
    type: input.type,
    member: input.member,
    amount: input.amount,
    date: Timestamp.fromDate(new Date(input.date)),
    createdBy: userId,
    createdAt: serverTimestamp(),
  };
  if (input.method) data.method = input.method;
  if (input.note?.trim()) data.note = input.note.trim();

  const ref = await addDoc(txRef(tripId), data);
  return ref.id;
};

/** Không xóa cứng: đánh dấu hủy kèm lý do để giữ lịch sử đối soát. */
export const voidFundTransaction = async (
  tripId: string,
  transactionId: string,
  reason?: string
): Promise<void> => {
  await updateDoc(doc(db, "trips", tripId, "fundTransactions", transactionId), {
    voidedAt: serverTimestamp(),
    voidReason: reason?.trim() ?? "",
    updatedAt: serverTimestamp(),
  });
};

// ─── Cấu hình quỹ (chỉ chủ chuyến) ───────────────────────────

export const enableFund = async (
  tripId: string,
  perPerson: number,
  currency: string
): Promise<void> => {
  assertPositiveInteger(perPerson);
  await updateDoc(tripRef(tripId), {
    fund: {
      enabled: true,
      perPerson,
      currency,
      requiredByMember: {},
      closedAt: null,
    },
    updatedAt: serverTimestamp(),
  });
};

export const updateFundPerPerson = async (
  tripId: string,
  perPerson: number,
  requiredByMember: Record<string, number>
): Promise<void> => {
  assertPositiveInteger(perPerson);
  await updateDoc(tripRef(tripId), {
    "fund.perPerson": perPerson,
    "fund.requiredByMember": requiredByMember,
    updatedAt: serverTimestamp(),
  });
};

/** Gọi hàm này sau khi đã kiểm tra countFundExpenses(expenses) === 0. */
export const disableFund = async (tripId: string): Promise<void> => {
  await updateDoc(tripRef(tripId), {
    "fund.enabled": false,
    updatedAt: serverTimestamp(),
  });
};

export const closeFund = async (tripId: string): Promise<void> => {
  await updateDoc(tripRef(tripId), {
    "fund.closedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const reopenFund = async (tripId: string): Promise<void> => {
  await updateDoc(tripRef(tripId), {
    "fund.closedAt": null,
    updatedAt: serverTimestamp(),
  });
};
