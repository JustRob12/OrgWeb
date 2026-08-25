// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates that an email string has a complete domain format with a valid TLD
 * e.g. name@gmail.com, student@school.edu.ph, user@company.org
 * Rejects incomplete domains such as @gma, @gmail, or missing extensions.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  // Regex requiring username, '@', domain name, '.', and TLD of at least 2 characters (.com, .edu.ph, etc.)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Strict validation for Student ID format: 0000-0000 (e.g. 2022-2703).
 * Must consist of exactly 4 digits, a hyphen, and 4 digits.
 */
export function isValidStudentId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim();
  const studentIdRegex = /^\d{4}-\d{4}$/;
  return studentIdRegex.test(trimmed);
}

/**
 * Formats user input as they type into 0000-0000 format.
 * Strips non-digits and automatically inserts the hyphen after 4 digits.
 * Maximum 9 characters (e.g. "2022-2703").
 */
export function formatStudentIdInput(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
}

/**
 * Normalizes a raw string (e.g. from Excel/CSV import) to 0000-0000 if it contains 8 contiguous digits,
 * or returns trimmed value for validation.
 */
export function normalizeStudentId(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 8)}`;
  }
  return trimmed;
}
