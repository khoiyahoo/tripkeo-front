import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/utils/format";
import { clearPendingQr, type QrDraft, savePendingQr } from "@/utils/qrPending";
import { BANK_APPS, buildPayUrl } from "@/utils/vietQr";

export type QrPaymentInfo = QrDraft["payment"];

interface QrPaymentSectionProps {
  info: QrPaymentInfo;
  /** Số tiền đang nhập trong form */
  amount: number;
  confirmed: boolean;
  /** Bản nháp hiện tại của form, lưu lại trước khi rời sang app ngân hàng */
  getDraft: () => QrDraft;
  /** Hỏi xác nhận ngay khi mở (khôi phục sau khi quay về từ app ngân hàng) */
  askOnMount?: boolean;
  onConfirmedChange: (v: boolean) => void;
}

const APP_KEY = "tripkeo_bank_app";

const readSavedApp = (): string => {
  try {
    return window.localStorage.getItem(APP_KEY) ?? BANK_APPS[0].appId;
  } catch {
    return BANK_APPS[0].appId;
  }
};

/**
 * Phần "Thanh toán" của khoản chi quét từ QR:
 * mở app ngân hàng với thông tin điền sẵn, và hỏi xác nhận khi người dùng quay lại.
 * Tripkeo không thể tự biết giao dịch có thành công hay không nên cần bước xác nhận.
 */
export const QrPaymentSection = ({
  info,
  amount,
  confirmed,
  getDraft,
  askOnMount = false,
  onConfirmedChange,
}: QrPaymentSectionProps) => {
  const [appId, setAppId] = useState(readSavedApp);
  const [askConfirm, setAskConfirm] = useState(askOnMount);
  const openedRef = useRef(false);

  const url = buildPayUrl({
    appId,
    bankBin: info.bankBin,
    accountNumber: info.accountNumber,
    amount,
    memo: info.memo || info.merchantName || "Thanh toan",
    accountName: info.merchantName,
    returnUrl: window.location.href,
  });

  // Quay lại Tripkeo sau khi mở app ngân hàng → hỏi đã chuyển chưa
  useEffect(() => {
    const onBack = () => {
      if (!openedRef.current) return;
      if (document.visibilityState === "hidden") return;
      openedRef.current = false;
      clearPendingQr();
      setAskConfirm(true);
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    window.addEventListener("pageshow", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
      window.removeEventListener("pageshow", onBack);
    };
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error("Không sao chép được");
    }
  };

  const openBank = () => {
    if (!url) return;
    try {
      window.localStorage.setItem(APP_KEY, appId);
    } catch {
      // bỏ qua
    }
    // Lưu bản nháp rồi chuyển trang: nếu trang bị tải lại khi quay về thì khôi phục được
    savePendingQr(getDraft());
    openedRef.current = true;
    window.location.href = url;
  };

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant p-3">
      <p className="font-medium text-on-surface text-sm">Thanh toán</p>

      <div className="space-y-1 text-on-surface-variant text-xs">
        <p>
          Chuyển tới:{" "}
          <b className="text-on-surface">{info.merchantName ?? "—"}</b>
        </p>
        <p className="flex flex-wrap items-center gap-1.5">
          {info.bankName ?? "Ngân hàng"} · {info.accountNumber}
          {info.accountNumber && (
            <button
              aria-label="Sao chép số tài khoản"
              className="cursor-pointer text-primary-400"
              onClick={() => copy(info.accountNumber ?? "", "số tài khoản")}
              type="button"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </p>
        {amount > 0 && <p>Số tiền: {formatCurrency(amount)}</p>}
      </div>

      {url ? (
        <>
          <div>
            <Label className="text-xs">Mở bằng app ngân hàng</Label>
            <Select onValueChange={setAppId} value={appId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[min(18rem,var(--radix-select-content-available-height))]">
                {BANK_APPS.map((a) => (
                  <SelectItem key={a.appId} value={a.appId}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={openBank} size="sm" type="button">
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Mở app ngân hàng để thanh toán
          </Button>
          <p className="text-on-surface-variant text-xs">
            Một số app ngân hàng không tự điền số tiền, khi đó hãy nhập tay.
          </p>
        </>
      ) : (
        <p className="text-on-surface-variant text-xs">
          {amount > 0
            ? "Chưa hỗ trợ mở app cho ngân hàng này. Hãy sao chép số tài khoản và chuyển tiền trong app ngân hàng của bạn."
            : "Nhập số tiền để mở app ngân hàng."}
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-2 text-on-surface text-sm">
        <input
          checked={confirmed}
          className="mt-1 h-4 w-4"
          onChange={(e) => onConfirmedChange(e.target.checked)}
          type="checkbox"
        />
        <span>Tôi đã chuyển khoản xong</span>
      </label>

      <Dialog onOpenChange={setAskConfirm} open={askConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bạn đã chuyển khoản chưa?</DialogTitle>
            <DialogDescription>
              Tripkeo không thấy được kết quả giao dịch trong app ngân hàng. Chỉ
              xác nhận nếu bạn đã chuyển {formatCurrency(amount)} thành công.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button onClick={() => setAskConfirm(false)} variant="outline">
              Chưa
            </Button>
            <Button
              onClick={() => {
                onConfirmedChange(true);
                setAskConfirm(false);
              }}
            >
              <Check className="mr-1 h-4 w-4" />
              Đã chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
