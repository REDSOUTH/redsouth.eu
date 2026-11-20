import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, ExternalLink, LogOut, Gamepad2, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { isValidUsernameFormat } from "@/lib/userProfile";
import { MinecraftOnboarding } from "@/components/auth/MinecraftOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function LauncherAuth() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firebaseUser, profile, isLoading, logout } = useAuthStore();

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    document.title = `REDSOUTH Studio — ${t("launcher_auth.page_title", "Authorize ONE Launcher")}`;
  }, [t]);

  // If not signed in, redirect to /login?redirect=/auth/launcher
  useEffect(() => {
    if (!isLoading && !firebaseUser) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [isLoading, firebaseUser, location.pathname, location.search, navigate]);

  if (isLoading || !firebaseUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  // Require Minecraft username onboarding before handing tokens to ONE Launcher
  if (!profile || !isValidUsernameFormat(profile.username)) {
    return <MinecraftOnboarding />;
  }

  const rawRedirectUri = searchParams.get("redirect_uri");
  const safeCallbackBase =
    rawRedirectUri && rawRedirectUri.startsWith("onelauncher://")
      ? rawRedirectUri
      : "onelauncher://login/callback";

  const handleContinueToLauncher = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsAuthorizing(true);
    try {
      const idToken = await user.getIdToken(true);
      const refreshToken = user.refreshToken;
      const separator = safeCallbackBase.includes("?") ? "&" : "?";
      const callbackUrl = `${safeCallbackBase}${separator}refresh_token=${encodeURIComponent(
        refreshToken
      )}&id_token=${encodeURIComponent(idToken)}`;

      setAuthorized(true);
      window.location.href = callbackUrl;
    } catch (err: any) {
      console.error("Failed to generate launcher tokens:", err);
      toast.error(t("launcher_auth.token_error", "Failed to authorize launcher. Please try again."));
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-foreground/10 bg-background/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center gap-3">
            <img src="/one-launcher/logo.svg" alt="ONE Launcher" className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("launcher_auth.title", "Connect to ONE Launcher")}
          </CardTitle>
          <CardDescription>
            {t(
              "launcher_auth.desc",
              "Confirm that you want to sign in to ONE Launcher with this REDSOUTH account."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border border-foreground/10 bg-background/40">
            <Avatar className="h-14 w-14 border border-border">
              <AvatarImage src={firebaseUser.photoURL || ""} alt={profile.username} />
              <AvatarFallback className="bg-muted text-lg font-bold">
                {profile.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-red-500 shrink-0" />
                <p className="font-semibold text-base truncate">{profile.username}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email || firebaseUser.email}</p>
            </div>
          </div>

          {authorized && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {t(
                  "launcher_auth.opening_notice",
                  "Opening ONE Launcher... If nothing happens, click the button again."
                )}
              </span>
            </div>
          )}

          <Button
            type="button"
            disabled={isAuthorizing}
            onClick={handleContinueToLauncher}
            className="w-full relative group border-0 overflow-hidden bg-white hover:bg-white shadow-lg h-11"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#FF9D00] transition-opacity duration-500 group-hover:opacity-0" />
            <div className="relative flex items-center justify-center w-full gap-2">
              <span className="font-bold text-white transition-opacity duration-500 group-hover:opacity-0 flex items-center gap-2">
                {isAuthorizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {t("launcher_auth.continue_btn", "Continuar en ONE Launcher")}
              </span>
              <span className="absolute inset-0 flex items-center justify-center font-bold bg-gradient-to-r from-[#FF0000] to-[#FF9D00] bg-clip-text text-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 flex items-center gap-2">
                {isAuthorizing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" />
                ) : (
                  <ExternalLink className="h-4 w-4 text-[#FF5500]" />
                )}
                {t("launcher_auth.continue_btn", "Continuar en ONE Launcher")}
              </span>
            </div>
          </Button>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSwitchAccount}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("launcher_auth.switch_account", "Cambiar de cuenta")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
