import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Settings, LogOut, Copy } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { firebaseUser, profile, logout } = useAuthStore();

  if (!firebaseUser) return null;

  const displayName =
    profile?.display_name ||
    profile?.redsouth_username ||
    profile?.username ||
    firebaseUser.displayName ||
    firebaseUser.email ||
    "Player";
  const handleName = profile?.redsouth_username || profile?.username;
  const subtitle = handleName ? `@${handleName}` : t("onboarding.pending", "Setup pending");
  const avatarSrc = firebaseUser.photoURL || "";
  const initials = displayName.substring(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    toast.success(t("auth.logout_success", "Signed out successfully."));
    navigate("/login");
  };

  const handleCopyUsername = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(displayName);
    toast.success(t("auth.username_copied", "Username copied to clipboard."));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-md hover:bg-transparent">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">{displayName}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {subtitle}
                </p>
                {handleName && (
                  <button
                    onClick={handleCopyUsername}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title={t("auth.copy_username", "Copy username")}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/account" className="w-full">
            <Settings />
            {t("auth.account_settings", "Account Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut />
          {t("auth.logout", "Log Out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
