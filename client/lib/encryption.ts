import CryptoJS from "crypto-js";

// Master key for two-way AES-256 encryption of credentials
const MASTER_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "acetrack-master-encryption-key-2026-aces";

/**
 * Encrypts a plain-text password with AES-256
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return "";
  try {
    const encrypted = CryptoJS.AES.encrypt(plainText.trim(), MASTER_ENCRYPTION_KEY).toString();
    return `enc_${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return plainText;
  }
}

/**
 * Decrypts an AES-256 encrypted password or falls back gracefully
 */
export function decryptPassword(cipherText?: string | null, fallbackStudentId?: string | null): string {
  if (!cipherText || cipherText.trim() === "") {
    return fallbackStudentId && fallbackStudentId.trim() ? fallbackStudentId.trim() : "0000-0000";
  }

  const trimmed = cipherText.trim();

  // If it starts with our AES prefix 'enc_'
  if (trimmed.startsWith("enc_")) {
    try {
      const rawCipher = trimmed.substring(4);
      const bytes = CryptoJS.AES.decrypt(rawCipher, MASTER_ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted && decrypted.trim() !== "") {
        return decrypted.trim();
      }
    } catch (error) {
      console.warn("Failed to decrypt password, using fallback:", error);
    }
  }

  // If it's a bcrypt hash ($2a$, $2b$, etc.) and has no decrypted plaintext, fallback to student ID
  if (trimmed.startsWith("$2a$") || trimmed.startsWith("$2b$") || trimmed.startsWith("$2y$") || trimmed.startsWith("$2x$")) {
    return fallbackStudentId && fallbackStudentId.trim() ? fallbackStudentId.trim() : "0000-0000";
  }

  // Otherwise it's already plain-text
  return trimmed;
}
