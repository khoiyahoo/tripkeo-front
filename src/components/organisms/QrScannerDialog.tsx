import jsQR from "jsqr";
import { ImageUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ParsedPaymentQr, parsePaymentQr } from "@/utils/vietQr";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (data: ParsedPaymentQr) => void;
}

const REASON_TEXT = {
  not_emv: "Đây không phải mã QR thanh toán ngân hàng (VietQR).",
  bad_crc: "Mã QR bị lỗi hoặc chưa đọc đủ. Hãy quét lại.",
  no_account: "Mã QR này không có thông tin tài khoản nhận tiền.",
} as const;

export const QrScannerDialog = ({
  open,
  onOpenChange,
  onScanned,
}: QrScannerDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const handleText = useCallback(
    (text: string): boolean => {
      const result = parsePaymentQr(text);
      if (!result.ok) {
        setError(REASON_TEXT[result.reason]);
        return false;
      }
      if (handledRef.current) return true;
      handledRef.current = true;
      onScanned(result.data);
      return true;
    },
    [onScanned]
  );

  useEffect(() => {
    if (!open) return;
    handledRef.current = false;
    setError(null);
    setCameraReady(false);

    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || cancelled) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
        // Thu nhỏ khung hình để quét nhanh hơn trên điện thoại
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, {
            inversionAttempts: "dontInvert",
          });
          if (code?.data && handleText(code.data)) return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Trình duyệt này không hỗ trợ camera. Hãy chọn ảnh QR từ thư viện."
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
        raf = requestAnimationFrame(tick);
      } catch {
        setError(
          "Không mở được camera. Hãy cho phép truy cập camera hoặc chọn ảnh QR."
        );
      }
    };
    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (stream) for (const t of stream.getTracks()) t.stop();
    };
  }, [open, handleText]);

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !ctx) return;
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(data.data, data.width, data.height, {
        inversionAttempts: "attemptBoth",
      });
      URL.revokeObjectURL(url);
      if (!code?.data) {
        setError("Không tìm thấy mã QR trong ảnh này.");
        return;
      }
      handleText(code.data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Không đọc được ảnh này.");
    };
    img.src = url;
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quét QR thanh toán</DialogTitle>
          <DialogDescription>
            Quét mã QR của quán để lấy số tiền, rồi ghi lại khoản chi.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
          <video
            className="h-full w-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
          {!cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/70" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
        </div>
        <canvas className="hidden" ref={canvasRef} />

        {error && <p className="text-error-400 text-sm">{error}</p>}

        <input
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPickImage(e.target.files?.[0]);
            e.target.value = "";
          }}
          ref={fileRef}
          type="file"
        />
        <Button
          className="w-full"
          onClick={() => fileRef.current?.click()}
          type="button"
          variant="outline"
        >
          <ImageUp className="mr-2 h-4 w-4" />
          Chọn ảnh QR từ thư viện
        </Button>
      </DialogContent>
    </Dialog>
  );
};
