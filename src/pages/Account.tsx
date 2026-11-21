import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  User as UserIcon,
  Lock,
  Link as LinkIcon,
  Gamepad2,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Trash2,
  Mail,
  KeyRound,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Plus,
} from "lucide-react";
import {
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  unlink,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { auth, db, googleProvider, githubProvider } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import {
  changeMinecraftUsername,
  changeRedsouthUsername,
  deleteSkinFromWorker,
  getCooldownRemainingDays,
  isMinecraftUsernameAvailable,
  isRedsouthUsernameAvailable,
  isValidUsernameFormat,
  updateRedsouthProfile,
  updateSkinSettings,
  uploadSkinToWorker,
  validatePasswordStrength,
} from "@/lib/userProfile";
import { formatErrorMessage } from "@/lib/utils";
import { MinecraftOnboarding } from "@/components/auth/MinecraftOnboarding";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { SkinViewer3D } from "@/components/account/SkinViewer3D";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function Account() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { firebaseUser, profile, isLoading, setProfile } = useAuthStore();

  const activeTab =
    tab === "minecraft" || tab === "security" || tab === "connections" ? tab : "profile";

  // REDSOUTH Profile state
  const [rsUsername, setRsUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCheckingRs, setIsCheckingRs] = useState(false);
  const [isRsFree, setIsRsFree] = useState<boolean | null>(null);
  const [isSavingRs, setIsSavingRs] = useState(false);

  // Email verification & change state
  const [isSendingVerify, setIsSendingVerify] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Minecraft Profile state
  const [mcUsername, setMcUsername] = useState("");
  const [isCheckingMc, setIsCheckingMc] = useState(false);
  const [isMcFree, setIsMcFree] = useState<boolean | null>(null);
  const [isSavingMc, setIsSavingMc] = useState(false);

  // Skin state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingSkin, setIsUploadingSkin] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);

  // Security / Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Connections state
  const [linkingProvider, setLinkingProvider] = useState<"google" | "github" | null>(null);

  // Delete Account dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    document.title = `REDSOUTH Studio — ${t("account.title", "My Account")}`;
  }, [t]);

  useEffect(() => {
    if (profile) {
      setRsUsername(profile.redsouth_username);
      setDisplayName(profile.display_name);
      setMcUsername(profile.username);
    }
  }, [profile]);

  const rsCooldownDays = getCooldownRemainingDays(profile?.last_redsouth_username_change);
  const mcCooldownDays = getCooldownRemainingDays(profile?.last_mc_username_change);

  const isRsChanged = Boolean(profile && rsUsername.trim() !== "" && rsUsername.trim() !== profile.redsouth_username);
  const isRsFormatValid = isValidUsernameFormat(rsUsername);

  const isMcChanged = Boolean(profile && mcUsername.trim() !== "" && mcUsername.trim() !== profile.username);
  const isMcFormatValid = isValidUsernameFormat(mcUsername);

  // Live REDSOUTH username availability
  useEffect(() => {
    if (!isRsChanged || !isRsFormatValid || !firebaseUser || rsCooldownDays > 0) {
      setIsRsFree(null);
      setIsCheckingRs(false);
      return;
    }
    let cancelled = false;
    setIsCheckingRs(true);
    const timer = setTimeout(async () => {
      try {
        const free = await isRedsouthUsernameAvailable(rsUsername, firebaseUser.uid);
        if (!cancelled) setIsRsFree(free);
      } catch {
        if (!cancelled) setIsRsFree(null);
      } finally {
        if (!cancelled) setIsCheckingRs(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rsUsername, isRsChanged, isRsFormatValid, firebaseUser, rsCooldownDays]);

  // Live Minecraft username availability
  useEffect(() => {
    if (!isMcChanged || !isMcFormatValid || !firebaseUser || mcCooldownDays > 0) {
      setIsMcFree(null);
      setIsCheckingMc(false);
      return;
    }
    let cancelled = false;
    setIsCheckingMc(true);
    const timer = setTimeout(async () => {
      try {
        const free = await isMinecraftUsernameAvailable(mcUsername, firebaseUser.uid);
        if (!cancelled) setIsMcFree(free);
      } catch {
        if (!cancelled) setIsMcFree(null);
      } finally {
        if (!cancelled) setIsCheckingMc(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mcUsername, isMcChanged, isMcFormatValid, firebaseUser, mcCooldownDays]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!firebaseUser) return null;

  if (!profile || !isValidUsernameFormat(profile.username)) {
    return <MinecraftOnboarding />;
  }

  const linkedProviders = firebaseUser.providerData.map((p) => p.providerId);
  const hasPasswordProvider = linkedProviders.includes("password");
  const hasGoogle = linkedProviders.includes("google.com");
  const hasGithub = linkedProviders.includes("github.com");
  const passwordStrength = validatePasswordStrength(newPassword);

  const formattedCreatedAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const handleSaveRedsouthProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRs(true);
    try {
      let updatedProfile = { ...profile };

      if (isRsChanged) {
        if (rsCooldownDays > 0) {
          toast.error(`You can change your REDSOUTH username again in ${rsCooldownDays} day(s).`);
          setIsSavingRs(false);
          return;
        }
        if (!isRsFormatValid) {
          toast.error(t("onboarding.invalid_format", "Username must be 3 to 16 characters (letters, numbers, underscores)."));
          setIsSavingRs(false);
          return;
        }
        updatedProfile = await changeRedsouthUsername(firebaseUser.uid, rsUsername);
      }

      if (displayName.trim() !== profile.display_name) {
        await updateRedsouthProfile(firebaseUser.uid, { display_name: displayName.trim() });
        updatedProfile = { ...updatedProfile, display_name: displayName.trim() };
      }

      setProfile(updatedProfile);
      toast.success(t("account.profile_updated", "REDSOUTH profile updated!"));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to update profile."));
    } finally {
      setIsSavingRs(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setIsSendingVerify(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success(t("account.verification_sent", "Verification email sent! Check your inbox."));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to send verification email."));
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsChangingEmail(true);
    try {
      if (hasPasswordProvider && emailPassword && firebaseUser.email) {
        const cred = EmailAuthProvider.credential(firebaseUser.email, emailPassword);
        await reauthenticateWithCredential(firebaseUser, cred);
      }
      await verifyBeforeUpdateEmail(firebaseUser, newEmail.trim());
      toast.success(
        t("account.email_change_sent", "Confirmation link sent to your new email! Click it to complete the change.")
      );
      setNewEmail("");
      setEmailPassword("");
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to request email change."));
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSaveMinecraftUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMcChanged) return;
    if (mcCooldownDays > 0) {
      toast.error(`You can change your Minecraft username again in ${mcCooldownDays} day(s).`);
      return;
    }
    if (!isMcFormatValid) {
      toast.error(t("onboarding.invalid_format", "Username must be 3 to 16 characters (letters, numbers, underscores)."));
      return;
    }
    if (isMcFree === false) {
      toast.error(t("onboarding.taken", "This Minecraft username is already taken."));
      return;
    }

    setIsSavingMc(true);
    try {
      const updated = await changeMinecraftUsername(firebaseUser.uid, mcUsername);
      setProfile(updated);
      toast.success(t("account.username_updated", "Minecraft username updated!"));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to update Minecraft username."));
    } finally {
      setIsSavingMc(false);
    }
  };

  const handleCopyUuid = () => {
    navigator.clipboard.writeText(profile.minecraft_uuid);
    toast.success(t("account.uuid_copied", "Minecraft UUID copied to clipboard."));
  };

  const handleModelChange = async (model: "classic" | "slim") => {
    if (profile.skin_model === model || isSavingModel) return;
    setIsSavingModel(true);
    try {
      await updateSkinSettings(firebaseUser.uid, { skin_model: model });
      setProfile({ ...profile, skin_model: model });
      toast.success(t("account.skin_model_updated", "Skin model updated!"));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to update skin model."));
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleSkinFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSkin(true);
    try {
      const skinUrl = await uploadSkinToWorker(firebaseUser, file, profile.skin_model);
      setProfile({ ...profile, skin_url: skinUrl });
      toast.success(t("account.skin_uploaded", "Skin updated successfully!"));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to upload skin."));
    } finally {
      setIsUploadingSkin(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveSkin = async () => {
    setIsUploadingSkin(true);
    try {
      await deleteSkinFromWorker(firebaseUser);
      setProfile({ ...profile, skin_url: null });
      toast.success(t("account.skin_removed", "Skin reset to default."));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to remove skin."));
    } finally {
      setIsUploadingSkin(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrength.isValid) {
      toast.error(t("auth.password_weak_error", "Password must meet all security requirements."));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("account.passwords_mismatch", "Passwords do not match."));
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (hasPasswordProvider) {
        if (!firebaseUser.email || !currentPassword) {
          toast.error("Please enter your current password.");
          setIsUpdatingPassword(false);
          return;
        }
        const cred = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, cred);
        await updatePassword(firebaseUser, newPassword);
        toast.success(t("account.password_updated", "Password updated successfully!"));
      } else {
        if (!firebaseUser.email) {
          toast.error("No email associated with this account.");
          setIsUpdatingPassword(false);
          return;
        }
        const cred = EmailAuthProvider.credential(firebaseUser.email, newPassword);
        await linkWithCredential(firebaseUser, cred);
        toast.success(t("account.password_created", "Password added to your account!"));
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to update password."));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = profile.email || firebaseUser.email;
    if (!targetEmail) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      toast.success(t("auth.forgot_password_sent", "Password reset email sent! Check your inbox."));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to send password reset email."));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLinkOAuth = async (providerName: "google" | "github") => {
    setLinkingProvider(providerName);
    try {
      const provider = providerName === "google" ? googleProvider : githubProvider;
      await linkWithPopup(firebaseUser, provider);
      toast.success(`${providerName === "google" ? "Google" : "GitHub"} account linked!`);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") return;
      toast.error(formatErrorMessage(err, `Failed to link ${providerName}.`));
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlinkOAuth = async (providerId: string, label: string) => {
    if (linkedProviders.length <= 1) {
      toast.error(t("account.cannot_unlink_last", "You cannot unlink your only sign-in method."));
      return;
    }
    try {
      await unlink(firebaseUser, providerId);
      toast.success(`${label} account unlinked.`);
    } catch (err: any) {
      toast.error(formatErrorMessage(err, `Failed to unlink ${label}.`));
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const uid = firebaseUser.uid;
      if (profile.redsouth_username_lower) {
        try {
          await deleteDoc(doc(db, "redsouth_usernames", profile.redsouth_username_lower));
        } catch {}
      }
      if (profile.username_lower) {
        try {
          await deleteDoc(doc(db, "usernames", profile.username_lower));
        } catch {}
      }
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch {}

      await deleteUser(firebaseUser);
      setProfile(null);
      toast.success(t("account.deleted", "Your account has been permanently deleted."));
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to delete account."));
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container max-w-5xl py-10 px-4 md:px-8 min-h-[calc(100vh-4rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-heading font-krona">
          {t("account.title", "My Account")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("account.description", "Manage your REDSOUTH identity, Minecraft profile, and security settings.")}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(value === "profile" ? "/account" : `/account/${value}`)}
        className="flex flex-col md:flex-row md:items-start gap-8"
      >
        <TabsList className="grid grid-cols-2 md:flex md:flex-col h-auto items-stretch bg-transparent gap-2 md:gap-0 md:space-y-2 p-0 md:w-64 shrink-0">
          <TabsTrigger
            value="profile"
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            {t("account.redsouth_profile_tab", "REDSOUTH Profile")}
          </TabsTrigger>
          <TabsTrigger
            value="minecraft"
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <Gamepad2 className="mr-2 h-4 w-4" />
            {t("account.minecraft_profile_tab", "Minecraft Profile")}
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <Lock className="mr-2 h-4 w-4" />
            {t("account.security_tab", "Security")}
          </TabsTrigger>
          <TabsTrigger
            value="connections"
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            {t("account.connections_tab", "Connections")}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          {/* 1. REDSOUTH PROFILE TAB */}
          <TabsContent value="profile" className="m-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
            <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.redsouth_profile_tab", "REDSOUTH Profile")}</CardTitle>
                </div>
                <CardDescription>
                  {t("account.redsouth_profile_desc", "Your REDSOUTH Studio web account information.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 rounded-md border border-border/50">
                    <AvatarImage src={firebaseUser.photoURL || ""} alt={profile.redsouth_username} />
                    <AvatarFallback className="text-xl rounded-md bg-muted">
                      {profile.redsouth_username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{profile.display_name || profile.redsouth_username}</h3>
                    <p className="text-sm text-muted-foreground">@{profile.redsouth_username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("account.created_at", "Member Since")}: {formattedCreatedAt}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveRedsouthProfile} className="space-y-4 pt-4 border-t border-border/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rs-username-edit">
                        {t("onboarding.redsouth_username_label", "REDSOUTH Username")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="rs-username-edit"
                          value={rsUsername}
                          onChange={(e) => setRsUsername(e.target.value)}
                          maxLength={16}
                          disabled={rsCooldownDays > 0}
                          className="pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingRs && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          {!isCheckingRs && isRsChanged && isRsFormatValid && isRsFree === true && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {!isCheckingRs && isRsChanged && isRsFormatValid && isRsFree === false && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {rsCooldownDays > 0 ? (
                        <p className="text-xs text-amber-500">
                          {t("account.username_cooldown", {
                            days: rsCooldownDays,
                            defaultValue: `You can change this username again in ${rsCooldownDays} day(s).`,
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t("account.username_30d_notice", "3–16 chars (a-z, 0-9, _). Can be changed once every 30 days.")}
                        </p>
                      )}
                      {!isCheckingRs && isRsChanged && isRsFormatValid && isRsFree === false && (
                        <p className="text-xs text-red-500 font-medium">
                          {t("onboarding.rs_taken", "This REDSOUTH username is already taken.")}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rs-display-name">
                        {t("account.display_name_label", "Display Name")}
                      </Label>
                      <Input
                        id="rs-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={32}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      isSavingRs ||
                      (!isRsChanged && displayName.trim() === profile.display_name) ||
                      (isRsChanged && (!isRsFormatValid || isRsFree === false || isCheckingRs || rsCooldownDays > 0))
                    }
                  >
                    {isSavingRs && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("account.save_changes", "Save Changes")}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Email & Verification Card */}
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <CardTitle>{t("account.email_title", "Email Address")}</CardTitle>
                  </div>
                  {firebaseUser.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t("account.email_verified", "Verified")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {t("account.email_unverified", "Not verified")}
                    </span>
                  )}
                </div>
                <CardDescription>
                  {t("account.email_desc", "Verify your email address or request a change to a new email.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-sm font-medium truncate">{firebaseUser.email || profile.email}</span>
                  {!firebaseUser.emailVerified && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendVerificationEmail}
                      disabled={isSendingVerify}
                    >
                      {isSendingVerify && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t("account.send_verification_btn", "Send verification email")}
                    </Button>
                  )}
                </div>

                <form onSubmit={handleChangeEmail} className="space-y-4 pt-2 border-t border-border/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">{t("account.new_email_label", "New Email Address")}</Label>
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="new-email@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                    {hasPasswordProvider && (
                      <div className="space-y-2">
                        <Label htmlFor="email-confirm-pw">
                          {t("account.current_password_label", "Current Password (to confirm)")}
                        </Label>
                        <Input
                          id="email-confirm-pw"
                          type="password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                  <Button type="submit" variant="outline" disabled={isChangingEmail || !newEmail.trim()}>
                    {isChangingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("account.change_email_btn", "Send Email Change Confirmation")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. MINECRAFT PROFILE TAB */}
          <TabsContent value="minecraft" className="m-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.mc_identity_title", "Minecraft Identity")}</CardTitle>
                </div>
                <CardDescription>
                  {t("account.mc_identity_desc", "Your in-game player name and immutable UUID for ONE Launcher.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSaveMinecraftUsername} className="space-y-3">
                  <Label htmlFor="mc-username-edit">
                    {t("onboarding.username_label", "Minecraft Username")}
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Input
                        id="mc-username-edit"
                        value={mcUsername}
                        onChange={(e) => setMcUsername(e.target.value)}
                        maxLength={16}
                        disabled={mcCooldownDays > 0}
                        className="pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingMc && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!isCheckingMc && isMcChanged && isMcFormatValid && isMcFree === true && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        {!isCheckingMc && isMcChanged && isMcFormatValid && isMcFree === false && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        !isMcChanged ||
                        !isMcFormatValid ||
                        isMcFree === false ||
                        isCheckingMc ||
                        isSavingMc ||
                        mcCooldownDays > 0
                      }
                    >
                      {isSavingMc && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t("account.save_changes", "Save Changes")}
                    </Button>
                  </div>
                  {mcCooldownDays > 0 ? (
                    <p className="text-xs text-amber-500">
                      {t("account.username_cooldown", {
                        days: mcCooldownDays,
                        defaultValue: `You can change this username again in ${mcCooldownDays} day(s).`,
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("account.username_30d_notice", "3–16 chars (a-z, 0-9, _). Can be changed once every 30 days.")}
                    </p>
                  )}
                  {!isCheckingMc && isMcChanged && isMcFormatValid && isMcFree === false && (
                    <p className="text-xs text-red-500 font-medium">
                      {t("onboarding.taken", "This Minecraft username is already taken.")}
                    </p>
                  )}
                </form>

                <div className="pt-4 border-t border-border/40 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("account.mc_uuid_label", "Minecraft UUID (Immutable)")}
                  </Label>
                  <div className="flex items-center gap-2 max-w-md">
                    <code className="flex-1 rounded-md bg-muted/60 px-3 py-2 text-xs font-mono truncate border border-border/50">
                      {profile.minecraft_uuid}
                    </code>
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyUuid} title="Copy UUID">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skin & Model Card */}
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <CardTitle>{t("account.skin_title", "Minecraft Skin")}</CardTitle>
                <CardDescription>
                  {t("account.skin_desc", "Upload a 64x64 or 64x32 .png skin file (max 64 KB) and choose your player model.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>{t("account.skin_model_label", "Skin Model")}</Label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <Button
                      type="button"
                      variant={profile.skin_model === "classic" ? "default" : "outline"}
                      disabled={isSavingModel}
                      onClick={() => handleModelChange("classic")}
                    >
                      Classic (Steve)
                    </Button>
                    <Button
                      type="button"
                      variant={profile.skin_model === "slim" ? "default" : "outline"}
                      disabled={isSavingModel}
                      onClick={() => handleModelChange("slim")}
                    >
                      Slim (Alex)
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/40">
                  <Label>{t("account.skin_file_label", "Skin Preview & Texture (64×64 / 64×32 PNG)")}</Label>
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <SkinViewer3D
                      skinUrl={profile.skin_url}
                      model={profile.skin_model}
                      className="w-full max-w-[260px] h-[340px]"
                    />

                    <div className="space-y-4 flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,.png"
                        onChange={handleSkinFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          disabled={isUploadingSkin}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploadingSkin ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {t("account.upload_skin", "Upload Skin (.png)")}
                        </Button>

                        {profile.skin_url && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isUploadingSkin}
                            onClick={handleRemoveSkin}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("account.reset_skin", "Reset Skin")}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("account.skin_hint", "Must be a valid .png file (64×64 or 64×32 pixels, max 64 KB). Drag the 3D model to rotate.")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. SECURITY TAB */}
          <TabsContent value="security" className="m-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <CardTitle>
                    {hasPasswordProvider
                      ? t("account.change_password_title", "Change Password")
                      : t("account.set_password_title", "Set a Password")}
                  </CardTitle>
                </div>
                <CardDescription>
                  {hasPasswordProvider
                    ? t("account.change_password_desc", "Update your account password using our security requirements.")
                    : t("account.set_password_desc", "Add an email password so you can also sign in without OAuth.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {hasPasswordProvider && (
                    <div className="space-y-2">
                      <Label htmlFor="current-pw">
                        {t("account.current_password_label", "Current Password")}
                      </Label>
                      <Input
                        id="current-pw"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-pw">{t("account.new_password_label", "New Password")}</Label>
                      <Input
                        id="new-pw"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw">{t("account.confirm_password_label", "Confirm Password")}</Label>
                      <Input
                        id="confirm-pw"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <PasswordChecklist password={newPassword} />

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={
                        isUpdatingPassword ||
                        !passwordStrength.isValid ||
                        newPassword !== confirmPassword
                      }
                    >
                      {isUpdatingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {hasPasswordProvider
                        ? t("account.update_password_btn", "Update Password")
                        : t("account.set_password_btn", "Set Password")}
                    </Button>

                    {hasPasswordProvider && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSendPasswordReset}
                        disabled={isSendingReset}
                      >
                        {isSendingReset && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t("auth.send_reset_link", "Send Reset Email")}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t("account.danger_zone", "Danger Zone")}
                </CardTitle>
                <CardDescription>
                  {t(
                    "account.delete_desc",
                    "Permanently delete your REDSOUTH account, Minecraft profile, and username reservations."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("account.delete_btn", "Delete Account")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. CONNECTIONS TAB */}
          <TabsContent value="connections" className="m-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.connections_tab", "Connections")}</CardTitle>
                </div>
                <CardDescription>
                  {t("account.connections_desc", "Link or unlink Google and GitHub for faster sign-in.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google */}
                  <div className="p-4 rounded-lg border border-border/50 bg-background/40 flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Google</span>
                      {hasGoogle ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {t("account.connected", "Connected")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("account.not_connected", "Not connected")}</span>
                      )}
                    </div>
                    {hasGoogle ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUnlinkOAuth("google.com", "Google")}
                        disabled={linkedProviders.length <= 1}
                        className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("account.unlink_btn", "Unlink")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleLinkOAuth("google")}
                        disabled={linkingProvider === "google"}
                        className="w-full justify-start"
                      >
                        {linkingProvider === "google" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {t("account.link_btn", "Link account")}
                      </Button>
                    )}
                  </div>

                  {/* GitHub */}
                  <div className="p-4 rounded-lg border border-border/50 bg-background/40 flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">GitHub</span>
                      {hasGithub ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {t("account.connected", "Connected")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("account.not_connected", "Not connected")}</span>
                      )}
                    </div>
                    {hasGithub ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUnlinkOAuth("github.com", "GitHub")}
                        disabled={linkedProviders.length <= 1}
                        className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("account.unlink_btn", "Unlink")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleLinkOAuth("github")}
                        disabled={linkingProvider === "github"}
                        className="w-full justify-start"
                      >
                        {linkingProvider === "github" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {t("account.link_btn", "Link account")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      </motion.div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => !isDeletingAccount && setIsDeleteDialogOpen(false)}
        title={t("account.delete_confirm_title", "Delete Account")}
        description={t(
          "account.delete_confirm_desc",
          "This action cannot be undone. Your Minecraft username and profile data will be permanently deleted."
        )}
        confirmText={t("account.delete_btn", "Delete Account")}
        cancelText={t("common.cancel", "Cancel")}
        isDestructive={true}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
