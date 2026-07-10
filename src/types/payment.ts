export interface PaymentTransaction {
  id: string;
  debtId: string; // Reference to the debt settlement (fromName-toName-amount)
  fromName: string;
  toName: string;
  amount: number; // Amount paid in this transaction
  originalDebtAmount: number; // Original debt amount before payment
  remainingDebtAmount: number; // Amount remaining after this payment (0 if fully paid)
  paidAt: Date;
  createdAt: Date;
  status: "pending" | "completed";
}

export interface PaymentHistoryRecord extends PaymentTransaction {
  // Extended with additional display information if needed
}

export interface DebtPaymentFormValues {
  amount: number; // Amount to pay (optional, defaults to full amount)
  note?: string; // Optional payment note
}

export interface DebtPaymentModalProps {
  isOpen: boolean;
  fromName: string;
  toName: string;
  totalDebtAmount: number;
  isPaid?: boolean; // true if marked as paid (need to unmark)
  onConfirm: () => Promise<void>; // For toggle: no parameters needed
  onCancel: () => void;
  isLoading?: boolean;
}
