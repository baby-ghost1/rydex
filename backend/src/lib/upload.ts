import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_DOCUMENT = ["application/pdf"];

export function uploadsConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export async function saveUpload(file: File) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (file.size > MAX_BYTES) throw new Error("Files must be 10 MB or smaller.");
  const isImage = ALLOWED_IMAGE.includes(file.type);
  const isVideo = ALLOWED_VIDEO.includes(file.type);
  const isDocument = ALLOWED_DOCUMENT.includes(file.type);
  if (!isImage && !isVideo && !isDocument) {
    throw new Error("Upload a JPG, PNG, WebP, PDF, MP4 or WebM file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (uploadsConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "rydex",
          resource_type: isVideo ? "video" : isDocument ? "auto" : "image",
          allowed_formats: isVideo
            ? ["mp4", "webm", "mov"]
            : isDocument
              ? ["pdf"]
              : ["jpg", "jpeg", "png", "webp", "avif"],
        },
        (error, uploaded) => {
          if (error || !uploaded) reject(error || new Error("Cloudinary upload failed"));
          else resolve({ secure_url: uploaded.secure_url });
        },
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, provider: "cloudinary" as const };
  }

  if (process.env.NODE_ENV === "production" && !uploadsConfigured()) {
    throw new Error(
      "Uploads are not configured. Add Cloudinary credentials or use an image URL.",
    );
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (isVideo ? "mp4" : isDocument ? "pdf" : "jpg");
  const digest = createHash("sha1").update(buffer).update(randomUUID()).digest("hex").slice(0, 20);
  const filename = `${digest}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${filename}`, provider: "local" as const };
}
