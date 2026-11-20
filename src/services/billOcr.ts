import workerUrl from "tesseract.js/dist/worker.min.js?url";
import coreLstm from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";
import coreSimdLstm from "tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url";

import { prepareBillImage } from "@/services/receiptImage";
import { type ParsedBill, parseBill } from "@/utils/billParse";

// Đọc chữ trên ảnh bill hoàn toàn trên máy: ảnh không rời thiết bị.
// Bộ đọc (Tesseract.js) và dữ liệu tiếng Việt chỉ được tải khi người dùng dùng "Chụp bill".

/** Điện thoại hỗ trợ WebAssembly SIMD thì dùng bản nhân nhanh hơn. */
const supportsSimd = (): boolean => {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
        1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
      ])
    );
  } catch {
    return false;
  }
};

const PSM = "6";

type TesseractWorker = Awaited<
  ReturnType<typeof import("tesseract.js")["createWorker"]>
>;
let workerPromise: Promise<TesseractWorker> | null = null;
let progressCb: ((label: string, ratio: number) => void) | null = null;

const STATUS_LABEL: Record<string, string> = {
  "loading tesseract core": "Đang tải bộ đọc chữ (lần đầu)",
  "initializing tesseract": "Đang khởi tạo",
  "loading language traineddata": "Đang tải dữ liệu tiếng Việt (lần đầu)",
  "initializing api": "Đang khởi tạo",
  "recognizing text": "Đang đọc bill",
};

const getWorker = (): Promise<TesseractWorker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("vie", 1, {
        workerPath: workerUrl,
        corePath: supportsSimd() ? coreSimdLstm : coreLstm,
        langPath: "/ocr/lang",
        gzip: false,
        logger: (m: { status: string; progress: number }) =>
          progressCb?.(STATUS_LABEL[m.status] ?? "Đang xử lý", m.progress ?? 0),
      });
      // Bill là một khối chữ, các cột cách nhau bằng khoảng trắng
      await worker.setParameters({
        tessedit_pageseg_mode: PSM as never,
        preserve_interword_spaces: "1",
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
};

export interface BillScanResult {
  text: string;
  bill: ParsedBill;
  /** Ảnh màu đã nén, để lưu làm chứng từ */
  image: Blob;
}

/** Đọc ảnh bill. `onProgress` nhận nhãn tiếng Việt và tỉ lệ 0..1 của bước hiện tại. */
export const scanBill = async (
  file: File,
  onProgress?: (label: string, ratio: number) => void
): Promise<BillScanResult> => {
  progressCb = onProgress ?? null;
  try {
    onProgress?.("Đang xử lý ảnh", 0);
    const prepared = await prepareBillImage(file);
    const worker = await getWorker();
    const { data } = await worker.recognize(prepared.canvas);
    return {
      text: data.text,
      bill: parseBill(data.text),
      image: prepared.upload,
    };
  } finally {
    progressCb = null;
  }
};

/** Giải phóng bộ nhớ (quan trọng trên iPhone) khi không dùng nữa. */
export const releaseBillOcr = async (): Promise<void> => {
  const p = workerPromise;
  workerPromise = null;
  if (!p) return;
  try {
    const w = await p;
    await w.terminate();
  } catch {
    // bỏ qua
  }
};
