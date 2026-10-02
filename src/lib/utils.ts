import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatErrorMessage(error: any, fallback = "An unexpected error occurred."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  if (error?.data?.data && typeof error.data.data === "object") {
    const messages = Object.entries(error.data.data)
      .map(([field, err]: [string, any]) => `${field}: ${err?.message || "Invalid value"}`)
      .join(", ");
    if (messages) return messages;
  }

  const rawMsg = error?.response?.message || error?.data?.message || error?.message || "";
  if (!rawMsg) return fallback;

  if (rawMsg.includes("Failed to authenticate") || rawMsg.includes("Failed to authenticate.")) {
    return "Invalid credentials. Please verify your username and password.";
  }
  if (rawMsg.includes("INVALID_TOTP")) {
    return "Invalid verification code. Please check your authenticator app.";
  }
  if (rawMsg.includes("TOTP_REQUIRED")) {
    return "Two-factor authentication code required.";
  }
  if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError")) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (rawMsg.includes("autocancelled") || error?.name === "AbortError") {
    return "";
  }

  return rawMsg;
}

