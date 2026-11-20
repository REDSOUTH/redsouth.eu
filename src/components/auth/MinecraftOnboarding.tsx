import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/useAuthStore";
import {
  createInitialUserProfile,
  isMinecraftUsernameAvailable,
  isRedsouthUsernameAvailable,
  isValidUsernameFormat,
} from "@/lib/userProfile";
import { formatErrorMessage } from "@/lib/utils";

interface MinecraftOnboardingProps {
  onComplete?: () => void;
}

export function MinecraftOnboarding({ onComplete }: MinecraftOnboardingProps) {
  const { t } = useTranslation();
  const { firebaseUser, setProfile, logout } = useAuthStore();

  const [rsUsername, setRsUsername] = useState("");
  const [sameForMc, setSameForMc] = useState(true);
  const [mcUsername, setMcUsername] = useState("");

  const [isCheckingRs, setIsCheckingRs] = useState(false);
  const [isRsAvailable, setIsRsAvailable] = useState<boolean | null>(null);

  const [isCheckingMc, setIsCheckingMc] = useState(false);
  const [isMcAvailable, setIsMcAvailable] = useState<boolean | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveMcUsername = sameForMc ? rsUsername : mcUsername;
  const isRsFormatValid = isValidUsernameFormat(rsUsername);
  const isMcFormatValid = isValidUsernameFormat(effectiveMcUsername);

  useEffect(() => {
    if (!isRsFormatValid) {
      setIsRsAvailable(null);
      setIsCheckingRs(false);
      return;
    }

    let cancelled = false;
    setIsCheckingRs(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isRedsouthUsernameAvailable(rsUsername, firebaseUser?.uid);
        if (!cancelled) setIsRsAvailable(available);
      } catch {
        if (!cancelled) setIsRsAvailable(null);
      } finally {
        if (!cancelled) setIsCheckingRs(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rsUsername, isRsFormatValid, firebaseUser?.uid]);

  useEffect(() => {
    if (!isMcFormatValid) {
      setIsMcAvailable(null);
      setIsCheckingMc(false);
      return;
    }

    let cancelled = false;
    setIsCheckingMc(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isMinecraftUsernameAvailable(effectiveMcUsername, firebaseUser?.uid);
        if (!cancelled) setIsMcAvailable(available);
      } catch {
        if (!cancelled) setIsMcAvailable(null);
      } finally {
        if (!cancelled) setIsCheckingMc(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveMcUsername, isMcFormatValid, firebaseUser?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!isRsFormatValid || !isMcFormatValid) {
      toast.error(t("onboarding.invalid_format", "Usernames must be 3 to 16 characters (letters, numbers, underscores)."));
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await createInitialUserProfile(firebaseUser, {
        redsouthUsername: rsUsername,
        minecraftUsername: effectiveMcUsername,
      });
      setProfile(profile);
      toast.success(t("onboarding.success", "Account profile created!"));
      onComplete?.();
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t("onboarding.error", "Failed to save usernames.")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    isRsFormatValid &&
    isMcFormatValid &&
    isRsAvailable !== false &&
    isMcAvailable !== false &&
    !isCheckingRs &&
    !isCheckingMc;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-foreground/10 bg-background/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2">
            <img src="/account-banner.svg" alt="REDSOUTH Account" className="h-10 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("onboarding.title", "Set up your Usernames")}
          </CardTitle>
          <CardDescription>
            {t(
              "onboarding.desc",
              "Choose your REDSOUTH account username and your in-game Minecraft player name."
            )}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* REDSOUTH Username */}
            <div className="space-y-2">
              <Label htmlFor="rs-username">
                {t("onboarding.redsouth_username_label", "REDSOUTH Username")}
              </Label>
              <div className="relative">
                <Input
                  id="rs-username"
                  type="text"
                  placeholder="redsouth_player"
                  value={rsUsername}
                  onChange={(e) => setRsUsername(e.target.value)}
                  maxLength={16}
                  autoFocus
                  className="pr-10 bg-background/50 border-foreground/10 focus-visible:ring-red-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingRs && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!isCheckingRs && isRsFormatValid && isRsAvailable === true && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  {!isCheckingRs && isRsFormatValid && isRsAvailable === false && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {!isCheckingRs && isRsFormatValid && isRsAvailable === false && (
                <p className="text-xs text-red-500 font-medium">
                  {t("onboarding.rs_taken", "This REDSOUTH username is already taken.")}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sameForMc}
                onChange={(e) => setSameForMc(e.target.checked)}
                className="rounded border-foreground/20 accent-red-500"
              />
              {t("onboarding.same_for_mc", "Use the same username for Minecraft")}
            </label>

            {/* Minecraft Username (when separate) */}
            {!sameForMc && (
              <div className="space-y-2">
                <Label htmlFor="mc-username">
                  {t("onboarding.username_label", "Minecraft Username")}
                </Label>
                <div className="relative">
                  <Input
                    id="mc-username"
                    type="text"
                    placeholder="Steve_123"
                    value={mcUsername}
                    onChange={(e) => setMcUsername(e.target.value)}
                    maxLength={16}
                    className="pr-10 bg-background/50 border-foreground/10 focus-visible:ring-red-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingMc && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!isCheckingMc && isMcFormatValid && isMcAvailable === true && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {!isCheckingMc && isMcFormatValid && isMcAvailable === false && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {!isCheckingMc && isMcFormatValid && isMcAvailable === false && (
                  <p className="text-xs text-red-500 font-medium">
                    {t("onboarding.taken", "This Minecraft username is already taken.")}
                  </p>
                )}
              </div>
            )}

            {sameForMc && !isCheckingMc && isMcFormatValid && isMcAvailable === false && (
              <p className="text-xs text-red-500 font-medium">
                {t("onboarding.taken", "This Minecraft username is already taken. Uncheck above to pick a different one.")}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {t("onboarding.rules", "3–16 characters: letters, numbers, and underscores (_) only.")}
            </p>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full relative group border-0 overflow-hidden bg-white hover:bg-white shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#FF9D00] transition-opacity duration-500 group-hover:opacity-0" />
              <div className="relative flex items-center justify-center w-full">
                <span className="font-bold text-white transition-opacity duration-500 group-hover:opacity-0 flex items-center gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("onboarding.continue", "Save & Continue")}
                </span>
                <span className="absolute inset-0 flex items-center justify-center font-bold bg-gradient-to-r from-[#FF0000] to-[#FF9D00] bg-clip-text text-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" />}
                  {t("onboarding.continue", "Save & Continue")}
                </span>
              </div>
            </Button>
          </CardContent>
        </form>

        <CardFooter className="justify-center border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("onboarding.switch_account", "Sign out / Use another account")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
