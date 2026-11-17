import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type { DebtSettlement } from "@/types/firestore";
import type { PaymentTransaction } from "@/types/payment";

// ⚠️ FIRESTORE SETUP REQUIRED:
// Ensure Firestore security rules allow writes to: /trips/{tripId}/paymentHistory
// Example rule:
// match /trips/{tripId}/paymentHistory/{document=**} {
//   allow read, write: if request.auth.uid != null && resource.data.createdBy == request.auth.uid;
// }

const paymentHistoryRef = (tripId: string) =>
  collection(db, "trips", tripId, "paymentHistory");

const settlementsRef = (tripId: string) =>
  collection(db, "trips", tripId, "settlements");

/**
 * Fetch all settlement statuses for a trip
 * @param tripId - Trip ID
 * @returns Map of settlement key to paid status
 */
export const getAllSettlementStatuses = async (
  tripId: string
): Promise<Map<string, { isPaid: boolean; paidAt: Date | null }>> => {
  const snapshot = await getDocs(settlementsRef(tripId));
  const statuses = new Map<string, { isPaid: boolean; paidAt: Date | null }>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const key = `${data.fromName}-${data.toName}`;
    statuses.set(key, {
      isPaid: data.isPaid || false,
      paidAt: data.paidAt?.toDate() || null,
    });
  });

  return statuses;
};

/**
 * Calculate settled debts by filtering out debts marked as paid in settlements
 * @param debts - Original debt settlements
 * @param settlementStatuses - Map of settlement statuses (fromName-toName -> isPaid)
 * @returns Debts excluding those marked as paid
 */
export const filterPaidSettlements = (
  debts: DebtSettlement[],
  settlementStatuses: Map<string, { isPaid: boolean }>
): DebtSettlement[] => {
  return debts.filter((debt) => {
    const key = `${debt.fromName}-${debt.toName}`;
    const status = settlementStatuses.get(key);
    // Only show debts that are NOT marked as paid
    return !status?.isPaid;
  });
};

/**
 * Calculate settled debts by subtracting paid amounts from original debts
 * @param debts - Original debt settlements
 * @param paymentHistory - Payment transactions
 * @returns Updated debts with settled amounts subtracted
 */
export const calculateSettledDebts = (
  debts: DebtSettlement[],
  paymentHistory: PaymentTransaction[]
): DebtSettlement[] => {
  return debts
    .map((debt) => {
      // Sum all paid amounts for this specific debt
      const totalPaid = paymentHistory
        .filter(
          (payment) =>
            payment.fromName === debt.fromName && payment.toName === debt.toName
        )
        .reduce((sum, payment) => sum + payment.amount, 0);

      // Calculate remaining amount
      const remainingAmount = Math.max(0, debt.amount - totalPaid);

      return {
        ...debt,
        amount: remainingAmount,
      };
    })
    .filter((debt) => debt.amount > 0.5); // Filter out settled debts
};

/**
 * Record a debt payment transaction
 * @param tripId - Trip ID
 * @param transaction - Payment transaction details
 * @returns Transaction ID
 * @throws Error if Firestore write fails
 */
export const recordDebtPayment = async (
  tripId: string,
  transaction: Omit<PaymentTransaction, "id" | "createdAt">
): Promise<string> => {
  if (!tripId) {
    throw new Error("tripId is required to record debt payment");
  }

  try {
    const docRef = await addDoc(paymentHistoryRef(tripId), {
      ...transaction,
      paidAt: transaction.paidAt || new Date(),
      createdAt: serverTimestamp(),
      status: "completed",
    });
    return docRef.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to record payment: ${errorMessage}`);
  }
};

/**
 * Get payment history for a specific debt (fromName -> toName)
 * @param tripId - Trip ID
 * @param fromName - Debtor name
 * @param toName - Creditor name
 * @returns List of payment transactions
 */
export const getDebtPaymentHistory = async (
  tripId: string,
  fromName: string,
  toName: string
): Promise<PaymentTransaction[]> => {
  const q = query(
    paymentHistoryRef(tripId),
    where("fromName", "==", fromName),
    where("toName", "==", toName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        paidAt: doc.data().paidAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }) as PaymentTransaction
  );
};

/**
 * Get all payment history for a trip
 * @param tripId - Trip ID
 * @returns List of all payment transactions
 */
export const getAllPaymentHistory = async (
  tripId: string
): Promise<PaymentTransaction[]> => {
  const snapshot = await getDocs(paymentHistoryRef(tripId));
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        paidAt: doc.data().paidAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }) as PaymentTransaction
  );
};

/**
 * Undo/delete a payment transaction
 * @param tripId - Trip ID
 * @param transactionId - Payment transaction ID
 */
export const undoDebtPayment = async (
  tripId: string,
  transactionId: string
): Promise<void> => {
  await deleteDoc(doc(db, "trips", tripId, "paymentHistory", transactionId));
};

// ─── Settlement Status Management ───────────────────────────

const settlementDocRef = (tripId: string, fromName: string, toName: string) =>
  doc(db, "trips", tripId, "settlements", `${fromName}-${toName}`);

/**
 * Toggle settlement paid status (mark as paid or unpaid)
 * @param tripId - Trip ID
 * @param fromName - Debtor name
 * @param toName - Creditor name
 * @param isPaid - New paid status
 * @param createdBy - UID of user performing the action
 * @throws Error if Firestore operation fails or user is not a trip member
 */
export const toggleSettlementPaid = async (
  tripId: string,
  fromName: string,
  toName: string,
  isPaid: boolean,
  createdBy: string
): Promise<void> => {
  if (!tripId) {
    throw new Error("tripId is required to toggle settlement status");
  }
  if (!createdBy) {
    throw new Error("createdBy is required to toggle settlement status");
  }

  try {
    // First, verify the user is a member of the trip
    const tripRef = doc(db, "trips", tripId);
    const tripSnapshot = await getDoc(tripRef);

    if (!tripSnapshot.exists()) {
      throw new Error("Trip not found");
    }

    const tripData = tripSnapshot.data();
    if (!tripData.memberIds?.includes(createdBy)) {
      throw new Error("User is not a member of this trip");
    }

    // Now attempt to update the settlement
    await setDoc(
      settlementDocRef(tripId, fromName, toName),
      {
        fromName,
        toName,
        isPaid,
        paidAt: isPaid ? serverTimestamp() : null,
        createdBy,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to toggle settlement status: ${errorMessage}`);
  }
};

/**
 * Get settlement paid status
 * @param tripId - Trip ID
 * @param fromName - Debtor name
 * @param toName - Creditor name
 * @returns Settlement status object or null if not found
 */
export const getSettlementStatus = async (
  tripId: string,
  fromName: string,
  toName: string
): Promise<{ isPaid: boolean; paidAt: Date | null } | null> => {
  try {
    const snapshot = await getDocs(
      query(
        settlementsRef(tripId),
        where("fromName", "==", fromName),
        where("toName", "==", toName)
      )
    );

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();
    return {
      isPaid: data.isPaid || false,
      paidAt: data.paidAt?.toDate() || null,
    };
  } catch (_error) {
    // Silently handle error - settlement may not exist yet
    return null;
  }
};
