"use server";

import crypto from "crypto";

/**
 * Deletes an image from Cloudinary using the secure "Destroy" API.
 * This runs on the server to keep the API Secret hidden from the browser.
 */
export async function deleteEventImage(imageUrl: string) {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    console.error("CLOUDINARY_URL is not set in environment variables.");
    return { success: false, error: "Cloudinary configuration missing." };
  }

  try {
    // 1. Extract credentials from CLOUDINARY_URL
    // Format: cloudinary://api_key:api_secret@cloud_name
    const url = new URL(cloudinaryUrl);
    const apiKey = url.username;
    const apiSecret = url.password;
    const cloudName = url.hostname;

    // 2. Extract public_id from the full URL
    // Standard format: https://res.cloudinary.com/.../image/upload/v[version]/[public_id].[ext]
    const parts = imageUrl.split("/");
    const filenameWithExtension = parts.pop() || "";
    
    // Find where the public_id starts (after 'upload/v[version]/')
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL format.");
    }
    
    // The version part usually starts with 'v' and follows 'upload/'
    const publicIdParts = parts.slice(uploadIndex + 2);
    const publicIdBase = filenameWithExtension.split(".")[0];
    
    const publicId = publicIdParts.length > 0 
      ? `${publicIdParts.join("/")}/${publicIdBase}`
      : publicIdBase;

    console.log(`Attempting to delete image with Public ID: ${publicId}`);

    // 3. Generate secure signature for the request
    const timestamp = Math.round(new Date().getTime() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    // 4. Send POST request to Cloudinary Destroy API
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();
    
    if (result.result === "ok") {
      console.log("Image successfully deleted from Cloudinary.");
      return { success: true };
    } else {
      console.warn("Cloudinary Deletion Status:", result);
      return { success: false, error: result.error?.message || "Cloudinary reported an issue." };
    }
  } catch (error: any) {
    console.error("Cloudinary Deletion Error:", error);
    return { success: false, error: error.message };
  }
}
