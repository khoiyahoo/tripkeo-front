import { createPartFromBase64, GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { isValidTripId, rateLimited, verifyTripRole } from "./_lib/auth.js";
import {
  ALLOWED_MIME,
  BILL_PROMPT,
  BILL_SCHEMA,
  extractJson,
  isModelUnavailable,
  MAX_IMAGE_BASE64_LENGTH,
  modelChain,
} from "./_lib/gemini.js";

/**
 * Đọc ảnh bill bằng Gemini và trả về dữ liệu có cấu trúc.
 * Chỉ chủ chuyến / thủ quỹ (người được thêm chi tiêu) của chuyến đó mới gọi được.
 * Khóa GEMINI_API_KEY chỉ nằm ở server, không bao giờ gửi về trình duyệt.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  const { tripId, image, mimeType } = req.body ?? {};
  if (!isValidTripId(tripId)) {
    return res.status(400).json({ error: "Invalid tripId" });
  }
  if (
    typeof image !== "string" ||
    image.length === 0 ||
    image.length > MAX_IMAGE_BASE64_LENGTH ||
    !ALLOWED_MIME.includes(mimeType)
  ) {
    return res.status(400).json({ error: "Invalid image" });
  }

  const auth = await verifyTripRole(req.headers.authorization, tripId, [
    "owner",
    "treasurer",
  ]);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (rateLimited(`read-bill:${auth.uid}`)) {
    return res.status(429).json({ error: "Too many requests, try later" });
  }

  const ai = new GoogleGenAI({ apiKey });
  const models = modelChain(
    process.env.GEMINI_MODEL,
    process.env.GEMINI_FALLBACK_MODEL
  );

  let lastError: unknown;
  // Tóm tắt từng lần thử (mô hình + mã lỗi) để app hiện lý do thật cho người dùng
  const attempts: string[] = [];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [createPartFromBase64(image, mimeType), BILL_PROMPT],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: BILL_SCHEMA,
          // Chừa chỗ cho phần "suy nghĩ" của mô hình, tránh JSON bị cắt dở
          maxOutputTokens: 8192,
          temperature: 0,
        },
      });
      let bill: unknown;
      try {
        bill = extractJson(response.text);
      } catch {
        return res.status(502).json({
          error: "Invalid AI response",
          detail: `${model}: phản hồi không phải JSON hợp lệ`,
        });
      }
      return res.status(200).json({ bill, model });
    } catch (err) {
      lastError = err;
      // Chỉ ghi mô hình, mã lỗi và đầu thông báo lỗi (không ghi ảnh hay khóa)
      const e = err as { status?: number; message?: string };
      attempts.push(
        `${model}: ${e.status ?? "?"} ${String(e.message ?? "")
          .replace(/\s+/g, " ")
          .slice(0, 160)}`
      );
      console.error(
        "read-bill failed",
        model,
        e.status,
        String(e.message ?? "").slice(0, 200)
      );
      // Mô hình không dùng được (chưa có quyền / ngừng) thì thử mô hình dự phòng
      if (!isModelUnavailable(err)) break;
    }
  }

  const status = (lastError as { status?: number } | null)?.status;
  if (status === 429) {
    return res.status(429).json({
      error: "AI quota exceeded, try later",
      detail: attempts.join(" | "),
    });
  }
  return res
    .status(502)
    .json({ error: "AI service error", detail: attempts.join(" | ") });
}
