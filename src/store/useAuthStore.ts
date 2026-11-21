import { create } from "zustand";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getUserProfile, type UserProfile } from "@/lib/userProfile";
import { checkIsAdmin } from "@/lib/admin";

interface AuthState {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isSettingUpProfile: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setSettingUpProfile: (val: boolean) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  if (isFirebaseConfigured) {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({
          firebaseUser: null,
          profile: null,
          isAdmin: false,
          isLoading: false,
          isSettingUpProfile: false,
        });
        return;
      }

      try {
        const [fetchedProfile, adminFlag] = await Promise.all([
          getUserProfile(user.uid),
          checkIsAdmin(user.uid),
        ]);
        const currentProfile = get().profile;
        const resolvedProfile =
          fetchedProfile ?? (currentProfile?.firebase_uid === user.uid ? currentProfile : null);
        set({
          firebaseUser: user,
          profile: resolvedProfile,
          isAdmin: adminFlag,
          isLoading: false,
        });
      } catch (err) {
        console.error("Failed to fetch Firestore user profile:", err);
        set({ firebaseUser: user, profile: null, isAdmin: false, isLoading: false });
      }
    });
  }

  return {
    firebaseUser: null,
    profile: null,
    isAdmin: false,
    isLoading: isFirebaseConfigured,
    isSettingUpProfile: false,
    setProfile: (profile) => set({ profile }),
    setSettingUpProfile: (isSettingUpProfile) => set({ isSettingUpProfile }),
    refreshProfile: async () => {
      const currentUser = get().firebaseUser || auth.currentUser;
      if (!currentUser) return;
      const [profile, adminFlag] = await Promise.all([
        getUserProfile(currentUser.uid),
        checkIsAdmin(currentUser.uid),
      ]);
      set({ firebaseUser: currentUser, profile, isAdmin: adminFlag });
    },
    logout: async () => {
      await signOut(auth);
      set({
        firebaseUser: null,
        profile: null,
        isAdmin: false,
        isSettingUpProfile: false,
      });
    },
  };
});
