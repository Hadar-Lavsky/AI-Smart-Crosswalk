import { v2 as cloudinary } from "cloudinary";

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are missing in environment variables");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.hostname === "res.cloudinary.com";
  } catch (_error) {
    return false;
  }
}

export function extractCloudinaryPublicId(url) {
  if (!isCloudinaryUrl(url)) return null;

  const parsed = new URL(url);
  const parts = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
  const uploadIndex = parts.findIndex((part) => part === "upload");
  if (uploadIndex === -1) return null;

  const afterUpload = parts.slice(uploadIndex + 1);
  if (!afterUpload.length) return null;

  // Skip version segment like v1773855263 when present.
  const publicIdParts = /^v\d+$/.test(afterUpload[0])
    ? afterUpload.slice(1)
    : afterUpload;

  if (!publicIdParts.length) return null;

  const withExt = publicIdParts.join("/");
  return withExt.replace(/\.[^/.]+$/, "");
}

export async function deleteCloudinaryAssetByUrl(url) {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) {
    throw new Error("Could not extract Cloudinary public_id from imageUrl");
  }

  configureCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  const status = result?.result;
  if (status !== "ok" && status !== "not found") {
    throw new Error(`Cloudinary delete failed for ${publicId}: ${status || "unknown"}`);
  }

  return { publicId, status };
}
