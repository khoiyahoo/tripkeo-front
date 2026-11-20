// Xử lý ảnh bill trước khi đọc chữ hoặc lưu: xoay đúng chiều, thu nhỏ, nén.

const MAX_SIDE = 1600;

export interface PreparedBillImage {
  /** Ảnh xám, tăng tương phản, dùng để đọc chữ */
  canvas: HTMLCanvasElement;
  /** Ảnh màu đã nén (JPEG) để lưu lại làm chứng từ */
  upload: Blob;
  width: number;
  height: number;
}

const loadBitmap = async (
  file: File
): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === "function") {
    try {
      // Xoay đúng chiều theo thông tin EXIF của ảnh chụp từ điện thoại
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // thử cách dự phòng bên dưới
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Không đọc được ảnh"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Thu nhỏ ảnh, chuyển xám và kéo giãn tương phản để chữ trên bill nhiệt mờ dễ đọc hơn. */
export const prepareBillImage = async (
  file: File
): Promise<PreparedBillImage> => {
  const bmp = await loadBitmap(file);
  const srcW = "naturalWidth" in bmp ? bmp.naturalWidth : bmp.width;
  const srcH = "naturalHeight" in bmp ? bmp.naturalHeight : bmp.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  // Ảnh màu để lưu
  const color = document.createElement("canvas");
  color.width = width;
  color.height = height;
  const cctx = color.getContext("2d");
  if (!cctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  cctx.drawImage(bmp, 0, 0, width, height);
  if ("close" in bmp) bmp.close();
  const upload = await new Promise<Blob>((resolve, reject) =>
    color.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Không nén được ảnh"))),
      "image/jpeg",
      0.8
    )
  );

  // Ảnh xám tăng tương phản để đọc chữ
  const gray = document.createElement("canvas");
  gray.width = width;
  gray.height = height;
  const gctx = gray.getContext("2d", { willReadFrequently: true });
  if (!gctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  gctx.drawImage(color, 0, 0);
  const img = gctx.getImageData(0, 0, width, height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = v;
    hist[v]++;
  }
  // Kéo giãn giữa phân vị 2% và 98% để bỏ qua điểm sáng/tối bất thường
  const total = width * height;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      hi = v;
      break;
    }
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(
      0,
      Math.min(255, Math.round(((d[i] - lo) * 255) / range))
    );
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  gctx.putImageData(img, 0, 0);
  return { canvas: gray, upload, width, height };
};
