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
