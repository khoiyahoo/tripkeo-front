import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Download, Eye, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TripMeta } from "@/utils/itineraryPdf";
import { ItineraryPdfDocument } from "@/utils/itineraryPdf";

import type { ActivityWithId } from "@/types/firestore";

// Re-export so TripDetailPage only imports from this file
export type { TripMeta };

// PDFViewer only renders when the dialog is open (isPreviewOpen gate)
// so it does not affect initial page load performance.
const LazyPdfViewer = ({
  tripMeta,
  days,
  activitiesByDate,
}: {
  tripMeta: TripMeta;
  days: { dayNumber: number; date: string }[];
  activitiesByDate: Record<string, ActivityWithId[]>;
}) => {
  return (
    <PDFViewer width="100%" height="100%" showToolbar>
      <ItineraryPdfDocument
        tripMeta={tripMeta}
        days={days}
        activitiesByDate={activitiesByDate}
      />
    </PDFViewer>
  );
};

// ─── Props ────────────────────────────────────────────────────
interface ItineraryPdfExportProps {
  tripMeta: TripMeta;
  days: { dayNumber: number; date: string }[];
  activitiesByDate: Record<string, ActivityWithId[]>;
}

// ─── Component ────────────────────────────────────────────────
export const ItineraryPdfExport = ({
  tripMeta,
  days,
  activitiesByDate,
}: ItineraryPdfExportProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileName = `${tripMeta.title.replace(/\s+/g, "_")}_lich_trinh.pdf`;

  // Total activities across all days – used to gate PDF generation
  const totalActivities = Object.values(activitiesByDate).reduce(
    (sum, acts) => sum + acts.length,
    0
  );

  const guardEmpty = (): boolean => {
    if (totalActivities === 0) {
      toast.warning(
        "Lịch trình chưa có hoạt động nào. Vui lòng thêm hoạt động trước khi xuất PDF."
      );
      return true;
    }
    // Check every day has at least one activity
    const emptyDays = days.filter(
      (d) => (activitiesByDate[d.date] ?? []).length === 0
    );
    if (emptyDays.length > 0) {
      const labels = emptyDays.map((d) => `Ngày ${d.dayNumber}`).join(", ");
      toast.warning(
        `Vui lòng điền đầy đủ hoạt động các ngày trước khi xem (${labels} chưa có hoạt động).`
      );
      return true;
    }
    return false;
  };

  const getBlob = (): Promise<Blob> => {
    const doc = (
      <ItineraryPdfDocument
        tripMeta={tripMeta}
        days={days}
        activitiesByDate={activitiesByDate}
      />
    );
    return pdf(doc).toBlob();
  };

  const handleDownload = async () => {
    if (guardEmpty()) return;
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải PDF thành công");
    } catch {
      toast.error("Không thể tạo PDF. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (guardEmpty()) return;
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: tripMeta.title,
          text: `Lịch trình chuyến đi ${tripMeta.title}`,
        });
      } else {
        // Fallback: download then notify
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.info("PDF đã được tải về – bạn có thể chia sẻ file này");
      }
    } catch (err) {
      // User cancelled share dialog – not an error
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Không thể chia sẻ PDF. Vui lòng thử lại.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Preview */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (guardEmpty()) return;
            setIsPreviewOpen(true);
          }}
          className="gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          Xem PDF
        </Button>

        {/* Download */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isGenerating}
          className="gap-1.5"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Tải PDF
        </Button>

        {/* Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          disabled={isGenerating}
          className="gap-1.5"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          Chia sẻ
        </Button>
      </div>

      {/* Preview dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base">
                {tripMeta.title} – Lịch trình
              </DialogTitle>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={isGenerating}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Tải xuống
              </Button>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1">
            {isPreviewOpen && (
              <LazyPdfViewer
                tripMeta={tripMeta}
                days={days}
                activitiesByDate={activitiesByDate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
