import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/useAuthStore";
import { pb } from "@/lib/pb";
import { toast } from "sonner";
import { Camera, User, Lock, Loader2, ShieldCheck, Smartphone, Check, Copy, LogOut, Link, Plus, Trash2, AlertTriangle, Monitor, Fingerprint, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import * as OTPAuth from "otpauth";
import { QRCodeSVG } from "qrcode.react";
import { UAParser } from "ua-parser-js";
import { isPasskeySupported, registerWebAuthnPasskey } from "@/lib/passkey";
import { formatErrorMessage } from "@/lib/utils";

export function Account() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const activeTab = tab || "profile";
  
  useEffect(() => {
    document.title = `REDSOUTH Studio — ${t("account.title", "Account")}`;
  }, [t]);

  const loadedTabsRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!user?.id) return;
    if (activeTab === "security" && !loadedTabsRef.current["security"]) {
      loadedTabsRef.current["security"] = true;
      loadPasswordStatus();
      loadPasskeys();
      loadConnections();
      loadLogs();
    } else if (activeTab === "connections" && !loadedTabsRef.current["connections"]) {
      loadedTabsRef.current["connections"] = true;
      loadConnections();
    }
  }, [user?.id, activeTab]);

  // Passkey State
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  const loadPasskeys = async () => {
    if (!user?.id) return;
    setIsLoadingPasskeys(true);
    try {
      const records = await pb.collection("passkeys").getFullList({
        filter: pb.filter("user = {:userId}", { userId: user.id }),
        sort: "-id",
        requestKey: null,
      });
      setPasskeys(records);
    } catch (err: any) {
      console.warn("Could not load passkeys:", err);
    } finally {
      setIsLoadingPasskeys(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const supported = await isPasskeySupported();
      if (!supported) {
        toast.error(t("auth.passkey_not_supported"));
        return;
      }

      const options = await pb.send("/api/passkeys/register/options", { method: "POST" });
      const credential = await registerWebAuthnPasskey(options);

      await pb.send("/api/passkeys/register/verify", {
        method: "POST",
        body: {
          ...credential,
          challengeId: options.challengeId,
          name: passkeyName.trim() || "Passkey",
        },
      });

      toast.success(t("account.passkeys_added_success"));
      setShowAddPasskeyModal(false);
      setPasskeyName("");
      loadPasskeys();
    } catch (err: any) {
      if (err.name === "NotAllowedError") return;
      console.error("Passkey registration error:", err);
      toast.error(formatErrorMessage(err, "Failed to register Passkey"));
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t("account.passkeys_title", "Passkeys"),
      description: t("account.passkeys_delete_confirm", "Are you sure you want to delete this passkey?"),
      confirmText: t("common.delete", "Delete"),
      onConfirm: async () => {
        try {
          await pb.collection("passkeys").delete(passkeyId);
          toast.success(t("account.passkeys_deleted_success", "Passkey deleted successfully."));
          loadPasskeys();
        } catch (err: any) {
          toast.error(formatErrorMessage(err, "Failed to delete Passkey"));
        }
      },
    });
  };

  const loadConnections = async () => {
    if (!user?.id) return;
    setIsLoadingConnections(true);
    try {
      const authMethodsData = await pb.collection("users").listAuthMethods({ requestKey: null });
      setAuthMethods(authMethodsData.oauth2.providers || []);
      
      const linked = await pb.collection("users").listExternalAuths(user.id, { requestKey: null });
      setExternalAuths(linked || []);
    } catch (err: any) {
      console.error("Failed to load connections:", err);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const [currentDeviceId, setCurrentDeviceId] = useState<string>(() => localStorage.getItem('rs_device_id') || "");

  const loadLogs = async () => {
    if (!user?.id) return;
    setIsLoadingLogs(true);
    try {
      const res = await pb.send("/api/users/sessions", { method: "GET" });
      if (res?.items && Array.isArray(res.items)) {
        setAuthLogs(res.items);
        if (res.currentDeviceId) {
          setCurrentDeviceId(res.currentDeviceId);
          localStorage.setItem('rs_device_id', res.currentDeviceId);
        }
        return;
      }
    } catch (sessionErr: any) {
      console.warn("Sessions API fallback to collection query:", sessionErr);
    }

    try {
      const records = await pb.collection("auth_logs").getList(1, 20, {
        filter: pb.filter("user = {:userId}", { userId: user.id }),
        sort: "-last_active,-created",
        requestKey: null,
      });
      setAuthLogs(records.items);
    } catch (err: any) {
      console.error("Failed to load logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Profile State
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Change Email State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSendingEmailChange, setIsSendingEmailChange] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
      setTotpEnabled(!!(user.totpEnabled || (user as any).totp_enabled));
    }
  }, [user]);

  // Security State
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isLoadingHasPassword, setIsLoadingHasPassword] = useState(false);
  const [canRemovePassword, setCanRemovePassword] = useState(false);
  const [isRemovingPassword, setIsRemovingPassword] = useState(false);

  const loadPasswordStatus = async () => {
    if (!user?.id) return;
    setIsLoadingHasPassword(true);
    try {
      const res = await pb.send("/api/users/has-password", { method: "GET" });
      setHasPassword(!!res?.hasPassword);
      setCanRemovePassword(!!res?.canRemovePassword);
    } catch (err) {
      console.warn("Could not check password status:", err);
      // Fallback to true to avoid locking UI
      setHasPassword(true);
    } finally {
      setIsLoadingHasPassword(false);
    }
  };

  // 2FA State
  const [totpEnabled, setTotpEnabled] = useState(!!(user?.totpEnabled || (user as any)?.totp_enabled));
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading2FA, setIsLoading2FA] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Connections State
  const [externalAuths, setExternalAuths] = useState<any[]>([]);
  const [authMethods, setAuthMethods] = useState<any[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  // Security Activity & Deletion State
  const [authLogs, setAuthLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

  // Calculate 30-day rule for username
  const lastUsernameChange = user?.lastUsernameChange;
  let daysRemaining = 0;
  let hoursRemaining = 0;
  let exactUnlockDate = "";
  let canChangeUsername = true;

  if (lastUsernameChange) {
    const lastChangeDate = new Date(lastUsernameChange);
    // Add 30 days
    const nextChangeDate = new Date(lastChangeDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now < nextChangeDate) {
      canChangeUsername = false;
      const diffTime = Math.abs(nextChangeDate.getTime() - now.getTime());
      
      const totalHours = Math.floor(diffTime / (1000 * 60 * 60));
      daysRemaining = Math.floor(totalHours / 24);
      hoursRemaining = totalHours % 24;

      const timeStr = nextChangeDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const dateStr = nextChangeDate.toLocaleDateString();
      exactUnlockDate = `${timeStr} ${dateStr}`;
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoadingProfile(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("username", username);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const updated = await pb.collection("users").update(user.id, formData);
      pb.authStore.save(pb.authStore.token, updated);
      try {
        await pb.collection("users").authRefresh();
      } catch (_) {}
      toast.success(t("account.profile_success", "Profile updated successfully."));
    } catch (error: any) {
      console.error(error);
      toast.error(formatErrorMessage(error, t("account.profile_error", "Error updating profile.")));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (password !== passwordConfirm) {
      toast.warning(t("account.password_mismatch", "Passwords do not match."));
      return;
    }

    setIsLoadingPassword(true);
    try {
      const updated = await pb.collection("users").update(user.id, {
        oldPassword,
        password,
        passwordConfirm
      });
      pb.authStore.save(pb.authStore.token, updated);
      try {
        await pb.collection("users").authRefresh();
      } catch (_) {}
      toast.success(t("account.password_success", "Password updated successfully."));
      setOldPassword("");
      setPassword("");
      setPasswordConfirm("");
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t("account.password_error", "Error updating password")));
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleSetInitialPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (password.length < 8) {
      toast.warning(t("account.password_min_length", "Password must be at least 8 characters long."));
      return;
    }

    if (password !== passwordConfirm) {
      toast.warning(t("account.password_mismatch", "Passwords do not match."));
      return;
    }

    setIsLoadingPassword(true);
    try {
      await pb.send("/api/users/set-initial-password", {
        method: "POST",
        body: {
          password,
          passwordConfirm,
        },
      });
      toast.success(t("account.set_password_success", "Password set successfully."));
      setHasPassword(true);
      setPassword("");
      setPasswordConfirm("");
      try {
        await pb.collection("users").authRefresh();
      } catch (_) {}
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t("account.password_error", "Error setting password")));
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleRemovePassword = () => {
    setConfirmDialog({
      isOpen: true,
      title: t("account.remove_password_title", "Remove Password"),
      description: t(
        "account.remove_password_confirm",
        "Are you sure you want to remove your password? You will only be able to sign in using your Passkeys or connected social accounts."
      ),
      confirmText: t("account.remove_password_btn", "Remove Password"),
      onConfirm: async () => {
        setIsRemovingPassword(true);
        try {
          await pb.send("/api/users/remove-password", { method: "POST" });
          toast.success(t("account.remove_password_success", "Password removed successfully."));
          setHasPassword(false);
          setCanRemovePassword(false);
          setOldPassword("");
          setPassword("");
          setPasswordConfirm("");
          try {
            await pb.collection("users").authRefresh();
          } catch (_) {}
        } catch (err: any) {
          toast.error(formatErrorMessage(err, "Failed to remove password."));
        } finally {
          setIsRemovingPassword(false);
        }
      },
    });
  };

  const handleStart2FASetup = () => {
    // Generate secret
    const secret = new OTPAuth.Secret({ size: 20 });
    setSetupSecret(secret.base32);
    
    // Generate otpauth URI
    const totp = new OTPAuth.TOTP({
      issuer: "REDSOUTH Studio",
      label: user?.email || "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret
    });
    setSetupUri(totp.toString());
    setIsSettingUp2FA(true);
    setVerifyCode("");
  };

  const handleVerifyAndEnable2FA = async () => {
    if (!verifyCode || verifyCode.length < 6) return;
    setIsLoading2FA(true);
    
    try {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(setupSecret)
      });
      const delta = totp.validate({ token: verifyCode, window: 1 });
      
      if (delta === null) {
        throw new Error(t("account.totp_invalid", "The entered code is incorrect"));
      }

      await pb.collection("users").update(user!.id, {
        totpSecret: setupSecret,
        totp_secret: setupSecret,
        totpEnabled: true,
        totp_enabled: true
      });
      
      setTotpEnabled(true);
      setIsSettingUp2FA(false);
      toast.success(t("account.totp_enabled_success", "Two-factor authentication enabled!"));
      
      // Refresh auth store to sync local data
      await pb.collection("users").authRefresh();
    } catch (err: any) {
      toast.error(formatErrorMessage(err, "Failed to enable two-factor authentication"));
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleChangeEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user!.email) return;
    setIsSendingEmailChange(true);
    try {
      await pb.collection('users').requestEmailChange(newEmail);
      toast.success(t('account.email_change_success', 'A confirmation link has been sent to your new email.'));
      setShowEmailModal(false);
      setNewEmail("");
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t('account.email_change_error', 'Failed to request email change.')));
    } finally {
      setIsSendingEmailChange(false);
    }
  };

  const handleDisableTOTP = () => {
    setConfirmDialog({
      isOpen: true,
      title: t("account.totp_disable_confirm_title", "Disable 2FA"),
      description: t("account.totp_disable_confirm", "Are you sure you want to disable 2FA?"),
      confirmText: t("account.totp_disable_btn", "Disable 2FA"),
      onConfirm: async () => {
        setIsLoading2FA(true);
        try {
          await pb.collection("users").update(user!.id, {
            totpSecret: "",
            totp_secret: "",
            totpEnabled: false,
            totp_enabled: false
          });
          setTotpEnabled(false);
          toast.success(t("account.totp_disable_success", "Two-factor authentication disabled."));
          try {
            await pb.collection("users").authRefresh();
          } catch (_) {}
        } catch (err: any) {
          toast.error(formatErrorMessage(err, t("account.totp_error", "Failed to disable 2FA")));
        } finally {
          setIsLoading2FA(false);
        }
      }
    });
  };

  const handleRevokeSessions = () => {
    setConfirmDialog({
      isOpen: true,
      title: t("account.revoke_btn", "Log out of all other devices"),
      description: t("account.revoke_confirm", "Are you sure you want to log out from all devices? This will also log you out of your current session."),
      onConfirm: async () => {
        setIsRevoking(true);
        try {
          // Invalida todos los tokens JWT y borra los registros de sesión en el backend
          await pb.send("/api/users/revoke-sessions", { method: "POST" });
          toast.success(t("account.revoke_success", "All sessions have been revoked."));
          
          // Limpiar sesión local
          pb.authStore.clear();
          window.location.href = "/auth/signin";
        } catch (err: any) {
          console.error("Revoke sessions error:", err);
          toast.error(formatErrorMessage(err, t("account.revoke_error", "Failed to revoke sessions")));
        } finally {
          setIsRevoking(false);
        }
      }
    });
  };

  const handleLinkProvider = async (providerName: string) => {
    const oldToken = pb.authStore.token;
    const oldModel = pb.authStore.model;
    let popupWindow: Window | null = null;
    let pollTimer: any = null;
    let closedTimer: any = null;
    let isCompleted = false;

    const cleanupTimers = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (closedTimer) {
        clearTimeout(closedTimer);
        closedTimer = null;
      }
    };
    
    try {
      await pb.collection("users").authWithOAuth2({ 
        provider: providerName,
        requestKey: `link_${providerName}`,
        urlCallback: (url: string) => {
          const width = 600;
          const height = 700;
          const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
          const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
          popupWindow = window.open(
            url,
            `link_${providerName}`,
            `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
          );

          if (!popupWindow) {
            toast.error(t('account.popup_blocked', 'Popup blocked. Please allow popups for this site.'));
            cleanupTimers();
            pb.cancelRequest(`link_${providerName}`);
            return;
          }

          pollTimer = setInterval(() => {
            if (isCompleted) {
              cleanupTimers();
              return;
            }

            if (popupWindow && popupWindow.closed && !closedTimer) {
              closedTimer = setTimeout(() => {
                if (!isCompleted) {
                  pb.cancelRequest(`link_${providerName}`);
                }
                cleanupTimers();
              }, 3000);
            }
          }, 300);
        }
      });

      isCompleted = true;
      cleanupTimers();
      await loadConnections();
      toast.success(t("account.provider_linked", `${providerName} account linked successfully.`));
    } catch (err: any) {
      cleanupTimers();
      if (err?.name === 'AbortError' || err?.isAbort) return;

      if (err.message === "TOTP_REQUIRED" || err.response?.message === "TOTP_REQUIRED" || err.status === 400) {
        // En PB v0.23, si el usuario tiene MFA activado, vincular una cuenta devuelve un token que pide TOTP.
        // Como ya estamos logueados, simplemente restauramos el token antiguo y consideramos que la vinculación tuvo éxito.
        pb.authStore.save(oldToken, oldModel);
        await loadConnections();
        toast.success(t("account.provider_linked", `${providerName} account linked successfully.`));
      } else {
        // Si falla la ventana emergente u otro error real, restauramos por seguridad y mostramos error
        pb.authStore.save(oldToken, oldModel);
        toast.error(formatErrorMessage(err, `Failed to link ${providerName} account`));
      }
    } finally {
      cleanupTimers();
    }
  };

  const handleUnlinkProvider = (providerName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t("account.unlink_btn", "Unlink"),
      description: t("account.unlink_confirm", `Are you sure you want to unlink ${providerName}?`),
      confirmText: t("account.unlink_btn", "Unlink"),
      onConfirm: async () => {
        try {
          await pb.collection("users").unlinkExternalAuth(user!.id, providerName);
          toast.success(t("account.unlink_success", `Successfully unlinked ${providerName}`));
          
          // Update linked state
          const newAuths = await pb.collection("users").listExternalAuths(user!.id);
          setExternalAuths(newAuths);
        } catch (error: any) {
          toast.error(formatErrorMessage(error, t("account.unlink_error", `Failed to unlink ${providerName}`)));
        }
      }
    });
  };

  const getProviderIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n === 'github') return <img src="/icons/oauth-github.svg" alt="GitHub" className="w-5 h-5" />;
    if (n === 'twitch') return <img src="/icons/oauth-twitch.svg" alt="Twitch" className="w-5 h-5" />;
    if (n === 'discord') return <img src="/icons/oauth-discord.svg" alt="Discord" className="w-5 h-5" />;
    if (n === 'google') return <img src="/icons/oauth-google.svg" alt="Google" className="w-5 h-5" />;
    return <Link className="w-5 h-5" />;
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== user!.username) return;
    setConfirmDialog({
      isOpen: true,
      title: t("account.delete_modal_title", "Permanently Delete Account"),
      description: t(
        "account.delete_modal_desc",
        "This action cannot be undone. All your personal data, sessions, and passkeys will be permanently deleted. Are you absolutely sure?"
      ),
      confirmText: t("account.delete_confirm_action", "Yes, delete my account"),
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await pb.send("/api/users/delete-me", { method: "POST" });
          toast.success(t("account.deleted_success", "Account permanently deleted."));
          pb.authStore.clear();
          window.location.href = "/auth/signin";
        } catch (err: any) {
          toast.error(formatErrorMessage(err, "Failed to delete account."));
          setIsDeleting(false);
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success(t("account.copied_success", "Copied to clipboard"));
  };

  if (!user) return null; // Or a redirect, but App.tsx will handle protection

  return (
    <div className="container max-w-5xl py-10 px-4 md:px-8 min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-heading font-krona">{t("account.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("account.description")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => navigate(`/account/${value}`)} className="flex flex-col md:flex-row md:items-start gap-8">
        <TabsList className="flex flex-col h-auto items-stretch bg-transparent space-y-2 p-0 md:w-64 shrink-0">
          <TabsTrigger 
            value="profile" 
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <User className="mr-2 h-4 w-4" />
            {t("account.profile_tab")}
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <Lock className="mr-2 h-4 w-4" />
            {t("account.security_tab")}
          </TabsTrigger>
          <TabsTrigger 
            value="connections" 
            className="justify-start px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md w-full transition-all"
          >
            <Link className="mr-2 h-4 w-4" />
            {t("account.connections_tab", "Connections")}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="profile" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.profile_tab")}</CardTitle>
                </div>
                <CardDescription>{t("account.profile_desc", "Update your profile picture and public information.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <div 
                      className="relative group cursor-pointer rounded-md overflow-hidden"
                      onClick={handleAvatarClick}
                    >
                      <Avatar className="h-28 w-28 rounded-md border-2 border-border/50 transition-colors">
                        <AvatarImage 
                          src={avatarPreview || (user.avatar ? `${pbUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}` : '')} 
                          className="object-cover"
                        />
                        <AvatarFallback className="text-3xl rounded-md bg-muted">
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-md">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{t("account.avatar_title")}</h3>
                      <p className="text-sm text-muted-foreground">{t("account.avatar_desc")}</p>
                    </div>
                  </div>

                  {/* Fields Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center h-5">
                        <Label htmlFor="name">{t("account.name_label")}</Label>
                      </div>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder={t("account.name_placeholder", "Your public name")}
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center h-5">
                        <Label htmlFor="email">{t("account.email_label")}</Label>
                        <button 
                          type="button" 
                          onClick={() => setShowEmailModal(true)}
                          className="text-xs text-red-500 hover:text-red-400 hover:underline"
                        >
                          {t("account.email_change_btn", "Change")}
                        </button>
                      </div>
                      <Input 
                        id="email" 
                        value={email || user?.email || ""} 
                        disabled
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="username">{t("account.username_label")}</Label>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted/50 border border-border rounded-l-md px-3 py-2 text-sm text-muted-foreground">
                          @
                        </div>
                        <Input 
                          id="username" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder={t("account.username_placeholder", "Your unique username")}
                          disabled={!canChangeUsername}
                          className="bg-background/50 rounded-l-none -ml-2 disabled:opacity-60"
                        />
                      </div>
                      {canChangeUsername ? (
                        <p className="text-xs text-muted-foreground">{t("account.username_hint")}</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 text-xs text-amber-500/90 font-medium mt-1">
                          <span>{t("account.username_locked_prefix")}</span>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <span className="underline decoration-dashed underline-offset-4 cursor-help">
                                  {t("account.username_locked_time", { days: daysRemaining, hours: hoursRemaining })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("account.username_unlocks_at", "Available on:")} {exactUnlockDate}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-6 mt-6">
                    <Button type="submit" disabled={isLoadingProfile} className="w-full sm:w-auto">
                      {isLoadingProfile ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("account.save_profile_loading")}</>
                      ) : (
                        t("account.save_profile")
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <CardTitle>
                    {hasPassword === false 
                      ? t("account.set_password_title", "Set Password") 
                      : t("account.password_title")}
                  </CardTitle>
                </div>
                <CardDescription>
                  {hasPassword === false 
                    ? t("account.set_password_desc", "Your account does not have a password yet because you registered via an external provider or Passkey. Set a password to also sign in using email and password.")
                    : t("account.password_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHasPassword ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                  </div>
                ) : hasPassword === false ? (
                  <form onSubmit={handleSetInitialPassword} className="space-y-6 w-full">
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-start gap-2.5">
                      <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <span>{t("account.no_password_notice", "You currently sign in using external providers or Passkey. Setting a password enables email and password sign-in.")}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="initialPassword">{t("account.new_password")}</Label>
                        <Input 
                          id="initialPassword" 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required
                          minLength={8}
                          placeholder="••••••••"
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="initialPasswordConfirm">{t("account.confirm_password")}</Label>
                        <Input 
                          id="initialPasswordConfirm" 
                          type="password" 
                          value={passwordConfirm} 
                          onChange={(e) => setPasswordConfirm(e.target.value)} 
                          required
                          minLength={8}
                          placeholder="••••••••"
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="border-t border-border/40 pt-6 mt-6">
                      <Button type="submit" disabled={isLoadingPassword} className="w-full sm:w-auto">
                        {isLoadingPassword ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("account.save_password_loading")}</>
                        ) : (
                          t("account.set_password_btn", "Set Password")
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSavePassword} className="space-y-6 w-full">
                    <div className="space-y-2">
                      <Label htmlFor="oldPassword">{t("account.old_password")}</Label>
                      <Input 
                        id="oldPassword" 
                        type="password" 
                        value={oldPassword} 
                        onChange={(e) => setOldPassword(e.target.value)} 
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t("account.new_password")}</Label>
                        <Input 
                          id="newPassword" 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required
                          minLength={8}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("account.confirm_password")}</Label>
                        <Input 
                          id="confirmPassword" 
                          type="password" 
                          value={passwordConfirm} 
                          onChange={(e) => setPasswordConfirm(e.target.value)} 
                          required
                          minLength={8}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="border-t border-border/40 pt-6 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <Button type="submit" disabled={isLoadingPassword} className="w-full sm:w-auto">
                        {isLoadingPassword ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("account.save_password_loading")}</>
                        ) : (
                          t("account.save_password")
                        )}
                      </Button>

                      {hasPassword && (canRemovePassword || externalAuths.length > 0 || passkeys.length > 0) ? (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleRemovePassword} 
                          disabled={isRemovingPassword}
                          className="w-full sm:w-auto text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                        >
                          {isRemovingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {t("account.remove_password_btn", "Remove Password")}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground sm:text-right">
                          {t("account.remove_password_requires_alt", "To remove your password, add a Passkey or link an external account first.")}
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* 2FA Section */}
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 mt-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.totp_title", "Two-Factor Authentication (2FA)")}</CardTitle>
                </div>
                <CardDescription>
                  {t("account.totp_desc", "Protect your account with an extra layer of security using an app like Google Authenticator or Authy.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!totpEnabled ? (
                  <>
                    {!isSettingUp2FA ? (
                      <div className="border-t border-border/40 pt-6">
                        <Button onClick={handleStart2FASetup} className="w-full sm:w-auto">
                          <Smartphone className="w-4 h-4 mr-2" />
                          {t("account.totp_enable_btn", "Enable 2FA")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6 max-w-md animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-4">
                          <Label className="block text-base">{t("account.totp_scan_desc", "1. Scan the QR code with your app.")}</Label>
                          <div className="bg-muted/50 p-6 rounded-xl flex flex-col justify-center items-center space-y-4">
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                              <QRCodeSVG value={setupUri} size={180} />
                            </div>
                            <div className="pt-4 border-t border-border/40 text-center">
                              <p className="text-xs text-muted-foreground">{t("account.totp_cant_scan", "If you can't scan it, enter this secret key manually:")}</p>
                              <div className="flex items-center justify-center mt-2 gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-primary font-mono text-sm select-all">
                                  {setupSecret}
                                </code>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(setupSecret)}>
                                  {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 mt-6 border-t border-border/40">
                          <Label className="block text-base">{t("account.totp_verify_desc", "2. Enter the 6-digit code to verify:")}</Label>
                          <div className="flex flex-col gap-4 items-center">
                            <InputOTP 
                              id="totp_setup"
                              name="totp_setup"
                              maxLength={6} 
                              value={verifyCode} 
                              onChange={setVerifyCode}
                              autoComplete="one-time-code"
                              inputMode="numeric"
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                            <div className="flex w-full gap-3 mt-2">
                              <Button 
                                className="flex-1"
                                onClick={handleVerifyAndEnable2FA} 
                                disabled={verifyCode.length !== 6 || isLoading2FA}
                              >
                                {isLoading2FA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {t("account.totp_verify_btn", "Verify and Enable")}
                              </Button>
                              <Button variant="ghost" onClick={() => setIsSettingUp2FA(false)} className="flex-1">
                                {t("common.cancel", "Cancel")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20">
                      <ShieldCheck className="h-5 w-5" />
                      <p className="text-sm font-medium">{t("account.totp_is_active", "Two-factor authentication is active. Your account is secure.")}</p>
                    </div>

                    <div className="border-t border-border/40 pt-6 mt-6">
                      <Button variant="ghost" onClick={handleDisableTOTP} disabled={isLoading2FA}>
                        {isLoading2FA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("account.totp_disable_btn", "Disable 2FA")}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Passkeys Section */}
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 mt-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.passkeys_title", "Passkeys")}</CardTitle>
                </div>
                <CardDescription>
                  {t("account.passkeys_desc", "Sign in instantly using your fingerprint, face (Windows Hello, Touch ID, Face ID), or a physical security key.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPasskeys ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : passkeys.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border/40 rounded-xl bg-background/20">
                    <KeyRound className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t("account.passkeys_empty", "You have no Passkeys registered yet.")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {passkeys.map((pk) => (
                      <div 
                        key={pk.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Fingerprint className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{pk.name || "Passkey"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(pk.created || pk.updated || Date.now()).toLocaleDateString(i18n.language, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePasskey(pk.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border/40 pt-6 mt-6">
                  <Button 
                    onClick={() => setShowAddPasskeyModal(true)} 
                    className="w-full sm:w-auto gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t("account.passkeys_add_btn", "Add Passkey")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sessions Section */}
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 mt-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.sessions_title", "Active Sessions")}</CardTitle>
                </div>
                <CardDescription>
                  {t("account.sessions_desc", "Here you can see the devices currently logged into your account. If you see something unfamiliar, revoke the sessions immediately.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingLogs ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : authLogs.length > 0 ? (
                    <div className="space-y-3">
                      {authLogs.map((log) => {
                        const parser = new UAParser(log.user_agent);
                        const device = parser.getDevice();
                        const os = parser.getOS();
                        const browser = parser.getBrowser();
                        
                        const isMobile = device.type === 'mobile' || device.type === 'tablet';
                        const DeviceIcon = isMobile ? Smartphone : Monitor;
                        
                        const deviceName = `${browser.name || 'Unknown Browser'} on ${os.name || 'Unknown OS'}`;
                        const isCurrentDevice = (currentDeviceId && log.device_id === currentDeviceId) || log.device_id === localStorage.getItem('rs_device_id');
                        
                        // Relative time logic
                        let relativeTime = t("account.recently", "Recientemente");
                        let absoluteTime = "";
                        const dStr = log.last_active || log.updated || log.created;
                        if (dStr) {
                          try {
                            const date = new Date(dStr);
                            if (!isNaN(date.getTime())) {
                              const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                              const dateStr = date.toLocaleDateString();
                              absoluteTime = `${timeStr} ${dateStr}`;
                              const rtf = new Intl.RelativeTimeFormat(i18n.language || 'es', { numeric: 'auto', style: 'long' });
                              const diffInSeconds = (date.getTime() - new Date().getTime()) / 1000;
                              const absDiff = Math.abs(diffInSeconds);
                              
                              if (absDiff < 60) relativeTime = rtf.format(Math.round(diffInSeconds), 'second');
                              else if (absDiff < 3600) relativeTime = rtf.format(Math.round(diffInSeconds / 60), 'minute');
                              else if (absDiff < 86400) relativeTime = rtf.format(Math.round(diffInSeconds / 3600), 'hour');
                              else if (absDiff < 2592000) relativeTime = rtf.format(Math.round(diffInSeconds / 86400), 'day');
                              else relativeTime = rtf.format(Math.round(diffInSeconds / 2592000), 'month');
                            }
                          } catch (e) {
                            // ignore
                          }
                        }

                        return (
                          <div key={log.id} className={`flex items-start justify-between bg-background/50 p-4 rounded-lg border ${isCurrentDevice ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <DeviceIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{deviceName}</span>
                                {isCurrentDevice && (
                                   <span className="text-[10px] uppercase font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-sm">
                                     {t("account.current_device", "Current")}
                                   </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="font-medium">{log.app_name || t("account.unknown_app", "REDSOUTH Web")}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block">
                                {t("account.last_active", "Last active")}
                              </span>
                              <span className="text-xs font-medium">
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <span className="underline decoration-dashed underline-offset-4 cursor-help capitalize">
                                        {relativeTime}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{absoluteTime}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-border/40 rounded-xl bg-background/20">
                      <Monitor className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">{t("account.no_activity", "No recent activity.")}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-6 mt-6">
                  <Button onClick={handleRevokeSessions} variant="destructive" disabled={isRevoking} className="w-full sm:w-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/20">
                    {isRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    {t("account.revoke_btn", "Log out of all other devices")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-500/20 shadow-sm bg-red-500/5 mt-6 overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-red-500">{t("account.danger_zone", "Danger Zone")}</CardTitle>
                </div>
                <CardDescription className="text-red-500/80">
                  {t("account.danger_desc", "Once you delete your account, there is no going back. Please be certain.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-red-500/90">{t("account.delete_confirm_label", `Type your username (${user.username}) to confirm:`)}</Label>
                  <Input 
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={user.username}
                    className="border-red-500/30 focus-visible:ring-red-500/50 max-w-sm"
                  />
                </div>
                <div className="border-t border-red-500/20 pt-6 mt-6">
                  <Button onClick={handleDeleteAccount} variant="destructive" disabled={isDeleting || deleteConfirmText !== user.username} className="w-full sm:w-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/20">
                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {t("account.delete_btn", "Permanently delete my account")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections" className="m-0 focus-visible:outline-none focus-visible:ring-0">
             <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-primary" />
                  <CardTitle>{t("account.connections_title", "Linked Accounts")}</CardTitle>
                </div>
                <CardDescription>{t("account.connections_desc", "Connect your social accounts to log in quickly or share your profile across REDSOUTH services.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingConnections ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {authMethods.map((provider) => {
                        const isLinked = externalAuths.find(e => e.provider === provider.name);
                        return (
                          <div key={provider.name} className="flex flex-col justify-between border border-border/50 rounded-xl p-5 bg-card/30 hover:bg-card/50 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2.5 bg-background rounded-lg border border-border/50 shadow-sm">
                                {getProviderIcon(provider.name)}
                              </div>
                              <div>
                                <h3 className="font-semibold capitalize text-base">{provider.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {isLinked ? t("account.connected", "Connected") : t("account.not_connected", "Not connected")}
                                </p>
                              </div>
                            </div>
                            
                            {isLinked ? (
                              <Button 
                                variant="destructive" 
                                className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/20" 
                                onClick={() => handleUnlinkProvider(provider.name)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t("account.unlink_btn", "Unlink")}
                              </Button>
                            ) : (
                              <Button 
                                variant="default" 
                                className="w-full justify-start" 
                                onClick={() => handleLinkProvider(provider.name)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {t("account.link_btn", "Link account")}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
      />

      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('account.email_change_title', 'Change Email')}</DialogTitle>
            <DialogDescription>
              {t('account.email_change_desc', 'Enter your new email address. We will send a confirmation link to this new address.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeEmailRequest} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">{t('account.email_change_new', 'New Email Address')}</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder={user?.email || ""}
                className="bg-background/50 border-foreground/10 focus-visible:ring-red-500"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowEmailModal(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSendingEmailChange || !newEmail || newEmail === user?.email} className="bg-white text-black hover:bg-zinc-200">
                {isSendingEmailChange ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('account.email_change_send', 'Send confirmation')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPasskeyModal} onOpenChange={setShowAddPasskeyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              {t("account.passkeys_add_btn", "Add Passkey")}
            </DialogTitle>
            <DialogDescription>
              {t("account.passkeys_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="passkeyName">{t("account.passkeys_name_prompt", "Device Name")}</Label>
              <Input
                id="passkeyName"
                placeholder={t("account.passkeys_name_placeholder", "e.g. My PC, iPhone, Work Laptop...")}
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRegisterPasskey();
                }}
                className="bg-background/50 border-foreground/10 focus-visible:ring-red-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddPasskeyModal(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleRegisterPasskey} disabled={isRegisteringPasskey} className="bg-white text-black hover:bg-zinc-200">
              {isRegisteringPasskey ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("account.passkeys_add_btn", "Add Passkey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
