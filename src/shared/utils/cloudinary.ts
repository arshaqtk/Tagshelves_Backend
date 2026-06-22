import { v2 as cloudinary } from "cloudinary";

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
  process.env.CLOUDINARY_API_KEY !== "your_api_key" &&
  process.env.CLOUDINARY_API_SECRET !== "your_api_secret"
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

/**
 * Uploads a file buffer to Cloudinary or returns it as a Base64 data URI if Cloudinary is not configured.
 * @param fileBuffer The file content buffer
 * @param mimeType The file mimetype (e.g. image/jpeg, image/png)
 * @param folder The target folder name in Cloudinary
 */
export async function uploadImage(
  fileBuffer: Buffer,
  mimeType: string,
  folder = "profiles"
): Promise<string> {
  if (!isCloudinaryConfigured) {
    console.warn("[Cloudinary] Credentials not fully configured. Using Base64 fallback.");
    const base64Data = fileBuffer.toString("base64");
    return `data:${mimeType};base64,${base64Data}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("[Cloudinary] Upload stream error:", error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error("Upload failed: No result from Cloudinary"));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}
