/** Tải ảnh lên Cloudinary bằng unsigned preset (cùng cấu hình với web). */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

/** `uri` là đường dẫn file local từ expo-image-picker. */
export async function uploadToCloudinary(
  uri: string,
  mimeType = "image/jpeg"
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const ext = mimeType.split("/")[1] ?? "jpg";
  const formData = new FormData();
  // React Native cho phép append object {uri,name,type} thay cho Blob
  formData.append("file", {
    uri,
    name: `upload.${ext}`,
    type: mimeType,
  } as unknown as Blob);
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

/** Tải lần lượt để không vượt giới hạn tốc độ. */
export async function uploadImages(
  files: { uri: string; mimeType?: string }[]
): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    urls.push(await uploadToCloudinary(f.uri, f.mimeType));
  }
  return urls;
}
