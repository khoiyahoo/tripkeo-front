/** Upload an image file to Cloudinary using an unsigned preset. */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
  | string
  | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
  | string
  | undefined;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  // Warn at module load — non-fatal so the rest of the app still works.
  // biome-ignore lint/suspicious/noConsole: startup diagnostic
  console.warn(
    "[cloudinaryService] VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET not set. Image upload will be unavailable."
  );
}

/** Resize a File/Blob to maxWidth before uploading (client-side, lossless for PNG, lossy for JPEG). */
function resizeImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const resized = await resizeImage(file);
  const formData = new FormData();
  formData.append("file", resized, file.name);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "tripkeo/community");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.status}`);
  }

  const data = (await response.json()) as CloudinaryResponse;
  return data.secure_url;
}

/** Upload multiple images sequentially (to stay within rate limits). */
export async function uploadImages(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadToCloudinary(file);
    urls.push(url);
  }
  return urls;
}
