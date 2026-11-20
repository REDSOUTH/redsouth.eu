import { create } from "zustand";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getUserProfile, type UserProfile } from "@/lib/userProfile";

interface AuthState {
  firebaseUser: User | null;
  profile: UserProfile | null;
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
        set({ firebaseUser: null, profile: null, isLoading: false, isSettingUpProfile: false });
        return;
      }

      try {
        const fetchedProfile = await getUserProfile(user.uid);
        const currentProfile = get().profile;
        // Avoid overwriting a freshly created local profile during registration race condition
        const resolvedProfile =
          fetchedProfile ?? (currentProfile?.firebase_uid === user.uid ? currentProfile : null);
        set({ firebaseUser: user, profile: resolvedProfile, isLoading: false });
      } catch (err) {
        console.error("Failed to fetch Firestore user profile:", err);
        set({ firebaseUser: user, profile: null, isLoading: false });
      }
    });
  }

  return {
    firebaseUser: null,
    profile: null,
    isLoading: isFirebaseConfigured,
    isSettingUpProfile: false,
    setProfile: (profile) => set({ profile }),
    setSettingUpProfile: (isSettingUpProfile) => set({ isSettingUpProfile }),
    refreshProfile: async () => {
      const currentUser = get().firebaseUser || auth.currentUser;
      if (!currentUser) return;
      const profile = await getUserProfile(currentUser.uid);
      set({ firebaseUser: currentUser, profile });
    },
    logout: async () => {
      await signOut(auth);
      set({ firebaseUser: null, profile: null, isSettingUpProfile: false });
    },
  };
});
