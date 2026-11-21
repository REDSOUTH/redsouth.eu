import { doc, getDoc, runTransaction, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

const SKINS_API_ENDPOINT = "https://auth.redsouth.eu/skins/upload";

export interface UserProfile {
  firebase_uid: string;
  // REDSOUTH Account Profile
  redsouth_username: string;
  redsouth_username_lower: string;
  display_name: string;
  last_redsouth_username_change: string | null;
  // Minecraft Profile (ONE Launcher & Skin Server)
  minecraft_uuid: string;
  username: string;
  username_lower: string;
  last_mc_username_change: string | null;
  skin_url: string | null;
  skin_model: "classic" | "slim";
  // Account metadata
  email: string;
  rank: string;
  created_at: string;
}

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
export const USERNAME_COOLDOWN_DAYS = 30;

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_REGEX.test(username.trim());
}

export interface PasswordValidation {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordValidation {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

export function getCooldownRemainingDays(lastChangeIso?: string | null): number {
  if (!lastChangeIso) return 0;
  const lastMs = new Date(lastChangeIso).getTime();
  if (Number.isNaN(lastMs)) return 0;
  const diffDays = (Date.now() - lastMs) / (1000 * 60 * 60 * 24);
  if (diffDays >= USERNAME_COOLDOWN_DAYS) return 0;
  return Math.ceil(USERNAME_COOLDOWN_DAYS - diffDays);
}

export function generateMinecraftUuid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function normalizeIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as any).toDate().toISOString();
  }
  return null;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();

  const mcUsername = String(data.username || "");
  const rsUsername = String(data.redsouth_username || mcUsername || "");

  return {
    firebase_uid: data.firebase_uid || uid,
    redsouth_username: rsUsername,
    redsouth_username_lower: data.redsouth_username_lower || rsUsername.toLowerCase(),
    display_name: String(data.display_name || rsUsername || ""),
    last_redsouth_username_change: normalizeIso(data.last_redsouth_username_change),
    minecraft_uuid: data.minecraft_uuid || "",
    username: mcUsername,
    username_lower: data.username_lower || mcUsername.toLowerCase(),
    last_mc_username_change: normalizeIso(data.last_mc_username_change),
    skin_url: data.skin_url ?? null,
    skin_model: data.skin_model === "slim" ? "slim" : "classic",
    email: data.email || "",
    rank: String(data.rank || "default"),
    created_at: normalizeIso(data.created_at) || new Date().toISOString(),
  };
}

export async function isMinecraftUsernameAvailable(username: string, currentUid?: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!isValidUsernameFormat(trimmed)) return false;
  const snap = await getDoc(doc(db, "usernames", trimmed.toLowerCase()));
  if (!snap.exists()) return true;
  return Boolean(currentUid && snap.data()?.uid === currentUid);
}

export async function isRedsouthUsernameAvailable(username: string, currentUid?: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!isValidUsernameFormat(trimmed)) return false;
  const snap = await getDoc(doc(db, "redsouth_usernames", trimmed.toLowerCase()));
  if (!snap.exists()) return true;
  return Boolean(currentUid && snap.data()?.uid === currentUid);
}

export interface CreateProfileParams {
  redsouthUsername: string;
  minecraftUsername: string;
  displayName?: string;
}

export async function createInitialUserProfile(
  user: User,
  params: CreateProfileParams
): Promise<UserProfile> {
  const rsTrimmed = params.redsouthUsername.trim();
  const mcTrimmed = params.minecraftUsername.trim();

  if (!isValidUsernameFormat(rsTrimmed) || !isValidUsernameFormat(mcTrimmed)) {
    throw new Error("INVALID_USERNAME_FORMAT");
  }

  const rsLower = rsTrimmed.toLowerCase();
  const mcLower = mcTrimmed.toLowerCase();

  const userRef = doc(db, "users", user.uid);
  const rsUsernameRef = doc(db, "redsouth_usernames", rsLower);
  const mcUsernameRef = doc(db, "usernames", mcLower);

  return await runTransaction(db, async (tx) => {
    const existingUserSnap = await tx.get(userRef);
    const rsSnap = await tx.get(rsUsernameRef);
    const mcSnap = await tx.get(mcUsernameRef);

    if (rsSnap.exists() && rsSnap.data()?.uid !== user.uid) {
      throw new Error("REDSOUTH_USERNAME_TAKEN");
    }
    if (mcSnap.exists() && mcSnap.data()?.uid !== user.uid) {
      throw new Error("MC_USERNAME_TAKEN");
    }

    const existingData = existingUserSnap.exists() ? existingUserSnap.data() : null;
    const minecraftUuid = existingData?.minecraft_uuid || generateMinecraftUuid();
    const createdAt = normalizeIso(existingData?.created_at) || new Date().toISOString();

    const newProfile: UserProfile = {
      firebase_uid: user.uid,
      redsouth_username: rsTrimmed,
      redsouth_username_lower: rsLower,
      display_name: params.displayName?.trim() || user.displayName || rsTrimmed,
      last_redsouth_username_change: normalizeIso(existingData?.last_redsouth_username_change),
      minecraft_uuid: minecraftUuid,
      username: mcTrimmed,
      username_lower: mcLower,
      last_mc_username_change: normalizeIso(existingData?.last_mc_username_change),
      skin_url: existingData?.skin_url ?? null,
      skin_model: existingData?.skin_model === "slim" ? "slim" : "classic",
      email: user.email || existingData?.email || "",
      rank: existingData?.rank ? String(existingData.rank) : "default",
      created_at: createdAt,
    };

    if (existingData?.redsouth_username_lower && existingData.redsouth_username_lower !== rsLower) {
      const oldRsRef = doc(db, "redsouth_usernames", existingData.redsouth_username_lower);
      const oldRsSnap = await tx.get(oldRsRef);
      if (oldRsSnap.exists() && oldRsSnap.data()?.uid === user.uid) {
        tx.delete(oldRsRef);
      }
    }

    if (existingData?.username_lower && existingData.username_lower !== mcLower) {
      const oldMcRef = doc(db, "usernames", existingData.username_lower);
      const oldMcSnap = await tx.get(oldMcRef);
      if (oldMcSnap.exists() && oldMcSnap.data()?.uid === user.uid) {
        tx.delete(oldMcRef);
      }
    }

    tx.set(rsUsernameRef, { uid: user.uid });
    tx.set(mcUsernameRef, { uid: user.uid });
    tx.set(userRef, newProfile, { merge: true });

    return newProfile;
  });
}

export async function changeRedsouthUsername(uid: string, newUsername: string): Promise<UserProfile> {
  const trimmed = newUsername.trim();
  if (!isValidUsernameFormat(trimmed)) {
    throw new Error("INVALID_USERNAME_FORMAT");
  }
  const newLower = trimmed.toLowerCase();

  const userRef = doc(db, "users", uid);
  const newRsRef = doc(db, "redsouth_usernames", newLower);

  return await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("PROFILE_NOT_FOUND");
    const currentData = userSnap.data();

    const remainingDays = getCooldownRemainingDays(normalizeIso(currentData.last_redsouth_username_change));
    if (remainingDays > 0) {
      throw new Error(`USERNAME_COOLDOWN:${remainingDays}`);
    }

    const newRsSnap = await tx.get(newRsRef);
    if (newRsSnap.exists() && newRsSnap.data()?.uid !== uid) {
      throw new Error("REDSOUTH_USERNAME_TAKEN");
    }

    const oldLower = currentData.redsouth_username_lower;
    if (oldLower && oldLower !== newLower) {
      const oldRsRef = doc(db, "redsouth_usernames", oldLower);
      const oldSnap = await tx.get(oldRsRef);
      if (oldSnap.exists() && oldSnap.data()?.uid === uid) {
        tx.delete(oldRsRef);
      }
    }

    const nowIso = new Date().toISOString();
    tx.set(newRsRef, { uid });
    tx.update(userRef, {
      redsouth_username: trimmed,
      redsouth_username_lower: newLower,
      last_redsouth_username_change: nowIso,
    });

    const refreshed = await getUserProfile(uid);
    if (refreshed) {
      return {
        ...refreshed,
        redsouth_username: trimmed,
        redsouth_username_lower: newLower,
        last_redsouth_username_change: nowIso,
      };
    }

    throw new Error("PROFILE_NOT_FOUND");
  });
}

export async function changeMinecraftUsername(uid: string, newUsername: string): Promise<UserProfile> {
  const trimmed = newUsername.trim();
  if (!isValidUsernameFormat(trimmed)) {
    throw new Error("INVALID_USERNAME_FORMAT");
  }
  const newLower = trimmed.toLowerCase();

  const userRef = doc(db, "users", uid);
  const newMcRef = doc(db, "usernames", newLower);

  return await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("PROFILE_NOT_FOUND");
    const currentData = userSnap.data();

    const remainingDays = getCooldownRemainingDays(normalizeIso(currentData.last_mc_username_change));
    if (remainingDays > 0) {
      throw new Error(`USERNAME_COOLDOWN:${remainingDays}`);
    }

    const newMcSnap = await tx.get(newMcRef);
    if (newMcSnap.exists() && newMcSnap.data()?.uid !== uid) {
      throw new Error("MC_USERNAME_TAKEN");
    }

    const oldLower = currentData.username_lower;
    if (oldLower && oldLower !== newLower) {
      const oldMcRef = doc(db, "usernames", oldLower);
      const oldSnap = await tx.get(oldMcRef);
      if (oldSnap.exists() && oldSnap.data()?.uid === uid) {
        tx.delete(oldMcRef);
      }
    }

    const nowIso = new Date().toISOString();
    tx.set(newMcRef, { uid });
    tx.update(userRef, {
      username: trimmed,
      username_lower: newLower,
      last_mc_username_change: nowIso,
    });

    const currentProfile = await getUserProfile(uid);
    if (currentProfile) {
      return {
        ...currentProfile,
        username: trimmed,
        username_lower: newLower,
        last_mc_username_change: nowIso,
      };
    }

    throw new Error("PROFILE_NOT_FOUND");
  });
}

export async function updateRedsouthProfile(
  uid: string,
  updates: { display_name?: string; email?: string }
): Promise<void> {
  await updateDoc(doc(db, "users", uid), updates);
}

export async function updateSkinSettings(
  uid: string,
  updates: { skin_model?: "classic" | "slim"; skin_url?: string | null }
): Promise<void> {
  await updateDoc(doc(db, "users", uid), updates);
}

export async function validateSkinPng(file: File): Promise<{ width: number; height: number }> {
  if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
    throw new Error("INVALID_SKIN_FORMAT");
  }
  if (file.size > 64 * 1024) {
    throw new Error("SKIN_TOO_LARGE");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { width, height } = img;
      URL.revokeObjectURL(url);
      if (width !== 64 || (height !== 64 && height !== 32)) {
        reject(new Error("INVALID_SKIN_DIMENSIONS"));
        return;
      }
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("INVALID_SKIN_FORMAT"));
    };
    img.src = url;
  });
}

export async function uploadSkinToWorker(
  user: User,
  file: File,
  model: "classic" | "slim"
): Promise<string> {
  await validateSkinPng(file);

  const idToken = await user.getIdToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);

  const response = await fetch(SKINS_API_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.skinUrl) {
    throw new Error(data?.message || data?.error || "Failed to upload skin to server.");
  }

  // Ensure Firestore user document is synced with the returned skinUrl and current skin_model
  await updateSkinSettings(user.uid, {
    skin_url: data.skinUrl,
    skin_model: model,
  });

  return String(data.skinUrl);
}

export async function deleteSkinFromWorker(user: User): Promise<void> {
  const idToken = await user.getIdToken();

  const response = await fetch(SKINS_API_ENDPOINT, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || data?.error || "Failed to delete skin from server.");
  }

  await updateSkinSettings(user.uid, { skin_url: null });
}
