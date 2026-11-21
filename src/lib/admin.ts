import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { isValidUsernameFormat, updateSkinSettings, validateSkinPng, type UserProfile } from "./userProfile";

const SKINS_API_ENDPOINT = "https://auth.redsouth.eu/skins/upload";

export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function adminListUsers(maxResults = 150): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), orderBy("created_at", "desc"), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const mcUsername = String(data.username || "");
    const rsUsername = String(data.redsouth_username || mcUsername || "");
    const createdAt =
      typeof data.created_at === "string"
        ? data.created_at
        : data.created_at?.toDate?.()?.toISOString?.() || new Date().toISOString();

    return {
      firebase_uid: data.firebase_uid || d.id,
      redsouth_username: rsUsername,
      redsouth_username_lower: data.redsouth_username_lower || rsUsername.toLowerCase(),
      display_name: String(data.display_name || rsUsername || ""),
      last_redsouth_username_change:
        typeof data.last_redsouth_username_change === "string" ? data.last_redsouth_username_change : null,
      minecraft_uuid: data.minecraft_uuid || "",
      username: mcUsername,
      username_lower: data.username_lower || mcUsername.toLowerCase(),
      last_mc_username_change:
        typeof data.last_mc_username_change === "string" ? data.last_mc_username_change : null,
      skin_url: data.skin_url ?? null,
      skin_model: data.skin_model === "slim" ? "slim" : "classic",
      email: data.email || "",
      rank: String(data.rank || "default"),
      created_at: createdAt,
    };
  });
}

export interface AdminUserUpdatePayload {
  redsouth_username: string;
  username: string;
  display_name: string;
  email: string;
  rank: string;
  skin_model: "classic" | "slim";
  skin_url: string | null;
  resetCooldowns?: boolean;
}

export async function adminUpdateUser(
  targetUid: string,
  updates: AdminUserUpdatePayload
): Promise<UserProfile> {
  const rsTrimmed = updates.redsouth_username.trim();
  const mcTrimmed = updates.username.trim();

  if (!isValidUsernameFormat(rsTrimmed) || !isValidUsernameFormat(mcTrimmed)) {
    throw new Error("INVALID_USERNAME_FORMAT");
  }

  const rsLower = rsTrimmed.toLowerCase();
  const mcLower = mcTrimmed.toLowerCase();
  const userRef = doc(db, "users", targetUid);

  return await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    const current = userSnap.data();
    const oldRsLower = String(current.redsouth_username_lower || "");
    const oldMcLower = String(current.username_lower || "");

    // Check & swap REDSOUTH username if changed
    if (rsLower !== oldRsLower) {
      const newRsRef = doc(db, "redsouth_usernames", rsLower);
      const newRsSnap = await tx.get(newRsRef);
      if (newRsSnap.exists() && newRsSnap.data()?.uid !== targetUid) {
        throw new Error("REDSOUTH_USERNAME_TAKEN");
      }
      if (oldRsLower) {
        const oldRsRef = doc(db, "redsouth_usernames", oldRsLower);
        const oldRsSnap = await tx.get(oldRsRef);
        if (oldRsSnap.exists() && oldRsSnap.data()?.uid === targetUid) {
          tx.delete(oldRsRef);
        }
      }
      tx.set(newRsRef, { uid: targetUid });
    }

    // Check & swap Minecraft username if changed (bypasses 30-day cooldown)
    if (mcLower !== oldMcLower) {
      const newMcRef = doc(db, "usernames", mcLower);
      const newMcSnap = await tx.get(newMcRef);
      if (newMcSnap.exists() && newMcSnap.data()?.uid !== targetUid) {
        throw new Error("MC_USERNAME_TAKEN");
      }
      if (oldMcLower) {
        const oldMcRef = doc(db, "usernames", oldMcLower);
        const oldMcSnap = await tx.get(oldMcRef);
        if (oldMcSnap.exists() && oldMcSnap.data()?.uid === targetUid) {
          tx.delete(oldMcRef);
        }
      }
      tx.set(newMcRef, { uid: targetUid });
    }

    const nextRank = updates.rank.trim().toLowerCase() || "default";
    const nextLastRs = updates.resetCooldowns
      ? null
      : current.last_redsouth_username_change ?? null;
    const nextLastMc = updates.resetCooldowns
      ? null
      : current.last_mc_username_change ?? null;

    const nextFields = {
      redsouth_username: rsTrimmed,
      redsouth_username_lower: rsLower,
      username: mcTrimmed,
      username_lower: mcLower,
      display_name: updates.display_name.trim() || rsTrimmed,
      email: updates.email.trim(),
      rank: nextRank,
      skin_model: updates.skin_model,
      skin_url: updates.skin_url?.trim() || null,
      last_redsouth_username_change: nextLastRs,
      last_mc_username_change: nextLastMc,
    };

    tx.update(userRef, nextFields);

    const createdAt =
      typeof current.created_at === "string"
        ? current.created_at
        : new Date().toISOString();

    return {
      firebase_uid: current.firebase_uid || targetUid,
      minecraft_uuid: current.minecraft_uuid || "",
      created_at: createdAt,
      ...nextFields,
    };
  });
}

export async function adminDeleteUserData(adminUser: User, target: UserProfile): Promise<void> {
  if (target.skin_url) {
    try {
      const idToken = await adminUser.getIdToken();
      await fetch(
        `${SKINS_API_ENDPOINT}?targetUid=${encodeURIComponent(target.firebase_uid)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
    } catch (err) {
      console.warn("Could not delete target user skin from Worker:", err);
    }
  }
  if (target.redsouth_username_lower) {
    try {
      await deleteDoc(doc(db, "redsouth_usernames", target.redsouth_username_lower));
    } catch (err) {
      console.warn("Could not delete redsouth_usernames doc:", err);
    }
  }
  if (target.username_lower) {
    try {
      await deleteDoc(doc(db, "usernames", target.username_lower));
    } catch (err) {
      console.warn("Could not delete usernames doc:", err);
    }
  }
  await deleteDoc(doc(db, "users", target.firebase_uid));
}

export async function adminUploadSkinForUser(
  adminUser: User,
  targetUser: UserProfile,
  file: File,
  model: "classic" | "slim"
): Promise<string> {
  await validateSkinPng(file);

  const idToken = await adminUser.getIdToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);
  formData.append("targetUid", targetUser.firebase_uid);

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

  const returnedUrl = String(data.skinUrl);
  if (
    adminUser.uid !== targetUser.firebase_uid &&
    targetUser.minecraft_uuid &&
    !returnedUrl.includes(targetUser.minecraft_uuid)
  ) {
    throw new Error("WORKER_TARGET_UID_UNSUPPORTED");
  }

  await updateSkinSettings(targetUser.firebase_uid, {
    skin_url: returnedUrl,
    skin_model: model,
  });

  return returnedUrl;
}
