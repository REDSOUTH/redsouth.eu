import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatErrorMessage(error: any, fallback = "An unexpected error occurred."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const code = error?.code || error?.message || "";

  if (String(code).startsWith("USERNAME_COOLDOWN:")) {
    const days = String(code).split(":")[1] || "30";
    return `You can change your username again in ${days} day(s).`;
  }

  const codeMap: Record<string, string> = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password does not meet security requirements.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
    "auth/cancelled-popup-request": "Sign-in popup was cancelled.",
    "auth/popup-blocked": "Popup was blocked by your browser. Please allow popups for this site.",
    "auth/account-exists-with-different-credential": "An account already exists with the same email using a different sign-in provider.",
    "auth/credential-already-in-use": "This provider account is already linked to another user.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/requires-recent-login": "For security reasons, please re-enter your password or sign in again before performing this action.",
    "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
    "USERNAME_TAKEN": "This username is already taken.",
    "REDSOUTH_USERNAME_TAKEN": "This REDSOUTH username is already taken.",
    "MC_USERNAME_TAKEN": "This Minecraft username is already taken.",
    "INVALID_USERNAME_FORMAT": "Username must be 3 to 16 characters (letters, numbers, and underscores only).",
    "INVALID_SKIN_FORMAT": "Please upload a valid .png image file.",
    "INVALID_SKIN_DIMENSIONS": "Skin image must be exactly 64x64 pixels.",
    "SKIN_TOO_LARGE": "Skin file is too large (max 100 KB).",
  };

  for (const [key, msg] of Object.entries(codeMap)) {
    if (String(code).includes(key)) {
      return msg;
    }
  }

  return error?.message || fallback;
}
