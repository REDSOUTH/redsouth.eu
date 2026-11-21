import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Shield,
  Search,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  Upload,
  User as UserIcon,
  Gamepad2,
} from "lucide-react";
import { adminDeleteUserData, adminListUsers, adminUpdateUser, adminUploadSkinForUser } from "@/lib/admin";
import { type UserProfile } from "@/lib/userProfile";
import { formatErrorMessage } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { SkinViewer3D } from "@/components/account/SkinViewer3D";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const RANK_PRESETS = ["default", "vip", "vip_plus", "mvp", "creator", "staff"];

export function Admin() {
  const { t } = useTranslation();
  const { firebaseUser, refreshProfile } = useAuthStore();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit dialog state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formRsUsername, setFormRsUsername] = useState("");
  const [formMcUsername, setFormMcUsername] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRank, setFormRank] = useState("default");
  const [formSkinModel, setFormSkinModel] = useState<"classic" | "slim">("classic");
  const [formSkinUrl, setFormSkinUrl] = useState("");
  const [resetCooldowns, setResetCooldowns] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSkin, setIsUploadingSkin] = useState(false);
  const skinInputRef = useRef<HTMLInputElement | null>(null);

  // Delete confirmation state
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.title = `REDSOUTH Studio — ${t("admin.page_title", "Admin Panel")}`;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const list = await adminListUsers();
      setUsers(list);
    } catch (err: any) {
      console.error("Failed to list users:", err);
      toast.error(formatErrorMessage(err, t("admin.load_error", "Failed to load users.")));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const openEditDialog = (user: UserProfile) => {
    setEditingUser(user);
    setFormRsUsername(user.redsouth_username);
    setFormMcUsername(user.username);
    setFormDisplayName(user.display_name);
    setFormEmail(user.email);
    setFormRank(user.rank || "default");
    setFormSkinModel(user.skin_model);
    setFormSkinUrl(user.skin_url || "");
    setResetCooldowns(false);
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.redsouth_username.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rank.toLowerCase().includes(q) ||
        u.minecraft_uuid.toLowerCase().includes(q) ||
        u.firebase_uid.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const updated = await adminUpdateUser(editingUser.firebase_uid, {
        redsouth_username: formRsUsername,
        username: formMcUsername,
        display_name: formDisplayName,
        email: formEmail,
        rank: formRank,
        skin_model: formSkinModel,
        skin_url: formSkinUrl.trim() || null,
        resetCooldowns,
      });

      setUsers((prev) =>
        prev.map((u) => (u.firebase_uid === updated.firebase_uid ? updated : u))
      );
      if (firebaseUser?.uid === updated.firebase_uid) {
        await refreshProfile();
      }
      toast.success(t("admin.user_updated", "User updated successfully!"));
      setEditingUser(null);
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t("admin.update_error", "Failed to update user.")));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser || !firebaseUser) return;
    setIsDeleting(true);
    try {
      await adminDeleteUserData(firebaseUser, deletingUser);
      setUsers((prev) => prev.filter((u) => u.firebase_uid !== deletingUser.firebase_uid));
      if (editingUser?.firebase_uid === deletingUser.firebase_uid) {
        setEditingUser(null);
      }
      toast.success(t("admin.user_deleted", "User Firestore data & username reservations deleted."));
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t("admin.delete_error", "Failed to delete user data.")));
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };

  const handleCopy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} copied.`);
  };

  const handleAdminSkinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser || !firebaseUser) return;
    setIsUploadingSkin(true);
    try {
      const url = await adminUploadSkinForUser(firebaseUser, editingUser, file, formSkinModel);
      setFormSkinUrl(url);
      setUsers((prev) =>
        prev.map((u) =>
          u.firebase_uid === editingUser.firebase_uid
            ? { ...u, skin_url: url, skin_model: formSkinModel }
            : u
        )
      );
      if (firebaseUser.uid === editingUser.firebase_uid) {
        await refreshProfile();
      }
      toast.success(t("account.skin_uploaded", "Skin updated successfully!"));
    } catch (err: any) {
      if (err?.message === "WORKER_TARGET_UID_UNSUPPORTED") {
        toast.error(
          t(
            "admin.worker_target_uid_notice",
            "Your Cloudflare Worker needs to allow `targetUid` for admins on POST /skins/upload."
          )
        );
      } else {
        toast.error(formatErrorMessage(err, "Failed to upload skin."));
      }
    } finally {
      setIsUploadingSkin(false);
      if (skinInputRef.current) skinInputRef.current.value = "";
    }
  };

  return (
    <div className="container max-w-6xl py-10 px-4 md:px-8 min-h-[calc(100vh-4rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Shield className="h-7 w-7 text-red-500" />
              <h1 className="text-3xl font-bold tracking-tight font-heading font-krona">
                {t("admin.title", "Admin Panel")}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1.5">
              {t("admin.desc", "Manage REDSOUTH accounts, ranks, Minecraft profiles, and skins.")}
            </p>
          </div>

          <Button variant="outline" onClick={loadUsers} disabled={isLoadingUsers}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? "animate-spin" : ""}`} />
            {t("admin.refresh", "Refresh")}
          </Button>
        </div>

        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>{t("admin.users_title", "Registered Accounts")}</CardTitle>
                <CardDescription>
                  {t("admin.users_count", {
                    count: filteredUsers.length,
                    defaultValue: `${filteredUsers.length} account(s) found`,
                  })}
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.search_placeholder", "Search by username, email, rank, UUID...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoadingUsers ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-red-500" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("admin.no_users", "No matching accounts found.")}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div
                    key={u.firebase_uid}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border/50 bg-background/40 hover:bg-background/60 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base truncate flex items-center gap-1.5">
                          <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          {u.redsouth_username}
                        </span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-sm font-medium text-foreground/90 flex items-center gap-1">
                          <Gamepad2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          {u.username}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                          {u.rank || "default"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email} • UUID: <code className="font-mono">{u.minecraft_uuid}</code>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(u)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        {t("admin.edit_btn", "Edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingUser(u)}
                        className="text-red-500 border-red-500/20 bg-red-500/10 hover:bg-red-500/20 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{t("admin.edit_user_title", "Manage User Account")}</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleSaveEdit} className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 3D Preview + Upload */}
                <div className="flex flex-col items-center gap-3">
                  <SkinViewer3D
                    skinUrl={formSkinUrl.trim() || null}
                    model={formSkinModel}
                    className="w-full max-w-[220px] h-[290px] min-h-[290px]"
                  />
                  <input
                    ref={skinInputRef}
                    type="file"
                    accept="image/png,.png"
                    onChange={handleAdminSkinUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingSkin}
                    onClick={() => skinInputRef.current?.click()}
                    className="w-full max-w-[220px]"
                  >
                    {isUploadingSkin ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-2" />
                    )}
                    {t("account.upload_skin", "Upload Skin (.png)")}
                  </Button>
                  <span className="text-[11px] text-muted-foreground text-center">
                    {t("admin.skin_preview_note", "Live 3D preview")}
                  </span>
                </div>

                {/* Fields */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Firebase UID</Label>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 rounded bg-muted/60 px-2.5 py-1.5 text-xs font-mono truncate border border-border/50">
                          {editingUser.firebase_uid}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => handleCopy(editingUser.firebase_uid, "Firebase UID")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Minecraft UUID</Label>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 rounded bg-muted/60 px-2.5 py-1.5 text-xs font-mono truncate border border-border/50">
                          {editingUser.minecraft_uuid}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => handleCopy(editingUser.minecraft_uuid, "Minecraft UUID")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Rank */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-rank">{t("admin.rank_label", "Rank")}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {RANK_PRESETS.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          size="xs"
                          variant={formRank.toLowerCase() === preset ? "default" : "outline"}
                          onClick={() => setFormRank(preset)}
                          className="uppercase text-[11px]"
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                    <Input
                      id="admin-rank"
                      value={formRank}
                      onChange={(e) => setFormRank(e.target.value)}
                      placeholder="default, vip, mvp..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-rs-user">
                        {t("onboarding.redsouth_username_label", "REDSOUTH Username")}
                      </Label>
                      <Input
                        id="admin-rs-user"
                        value={formRsUsername}
                        onChange={(e) => setFormRsUsername(e.target.value)}
                        maxLength={16}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="admin-mc-user">
                        {t("onboarding.username_label", "Minecraft Username")}
                      </Label>
                      <Input
                        id="admin-mc-user"
                        value={formMcUsername}
                        onChange={(e) => setFormMcUsername(e.target.value)}
                        maxLength={16}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-display-name">
                        {t("account.display_name_label", "Display Name")}
                      </Label>
                      <Input
                        id="admin-display-name"
                        value={formDisplayName}
                        onChange={(e) => setFormDisplayName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="admin-email">{t("auth.email", "Email")}</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("account.skin_model_label", "Skin Model")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={formSkinModel === "classic" ? "default" : "outline"}
                          onClick={() => setFormSkinModel("classic")}
                        >
                          Classic
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={formSkinModel === "slim" ? "default" : "outline"}
                          onClick={() => setFormSkinModel("slim")}
                        >
                          Slim
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="admin-skin-url">{t("admin.skin_url_label", "Skin URL")}</Label>
                      <div className="flex gap-1.5">
                        <Input
                          id="admin-skin-url"
                          value={formSkinUrl}
                          onChange={(e) => setFormSkinUrl(e.target.value)}
                          placeholder="https://auth.redsouth.eu/skins/..."
                        />
                        {formSkinUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormSkinUrl("")}
                          >
                            {t("admin.clear_skin", "Clear")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="admin-reset-cooldowns"
                      checked={resetCooldowns}
                      onCheckedChange={(checked) => setResetCooldowns(checked === true)}
                    />
                    <Label
                      htmlFor="admin-reset-cooldowns"
                      className="text-xs font-normal text-muted-foreground cursor-pointer select-none"
                    >
                      {t("admin.reset_cooldowns", "Reset 30-day username change cooldowns")}
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between border-t border-border/40 pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeletingUser(editingUser)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("admin.delete_data_btn", "Delete User Data")}
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("account.save_changes", "Save Changes")}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete User Data */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => !isDeleting && setDeletingUser(null)}
        title={t("admin.delete_confirm_title", "Delete User Data")}
        description={t("admin.delete_confirm_desc", {
          username: deletingUser?.redsouth_username || deletingUser?.email || "",
          defaultValue: `This will permanently delete the Firestore profile, skin link, and username reservations for ${
            deletingUser?.redsouth_username || deletingUser?.email || "this user"
          }. (Note: Firebase Auth login credentials must be removed in Firebase Console -> Authentication if needed.)`,
        })}
        confirmText={t("admin.delete_data_btn", "Delete User Data")}
        cancelText={t("common.cancel", "Cancel")}
        isDestructive={true}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
