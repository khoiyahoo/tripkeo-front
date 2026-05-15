import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Download, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SettlementResult } from "@/services/expenseService";
import type { ExpensePdfMeta } from "@/utils/expensePdf";
import { ExpensePdfDocument } from "@/utils/expensePdf";

import type { ExpenseWithId } from "@/types/firestore";

export type { ExpensePdfMeta };

interface ExpensesPdfExportProps {
  meta: ExpensePdfMeta;
  expenses: ExpenseWithId[];
  budget: number;
  totalGroupSpent: number;
  settlement: SettlementResult;
}

export const ExpensesPdfExport = ({
  meta,
  expenses,
  budget,
  totalGroupSpent,
  settlement,
}: ExpensesPdfExportProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileName = `${meta.title.replace(/\s+/g, "_")}_chi_phi.pdf`;

  const guardEmpty = (): boolean => {
    if (expenses.length === 0) {
      toast.warning(
        "Chưa có chi phí nào. Vui lòng thêm chi phí trước khi xuất PDF."
      );
      return true;
    }
    return false;
  };

  const getBlob = (): Promise<Blob> =>
    pdf(
      <ExpensePdfDocument
        meta={meta}
        expenses={expenses}
        budget={budget}
        totalGroupSpent={totalGroupSpent}
        settlement={settlement}
      />
    ).toBlob();

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

  return (
    <>
      <div className="flex flex-wrap gap-2">
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
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base">
                {meta.title} – Chi phí
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
              <PDFViewer width="100%" height="100%" showToolbar>
                <ExpensePdfDocument
                  meta={meta}
                  expenses={expenses}
                  budget={budget}
                  totalGroupSpent={totalGroupSpent}
                  settlement={settlement}
                />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
