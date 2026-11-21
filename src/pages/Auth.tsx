import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import {
  createInitialUserProfile,
  getUserProfile,
  isMinecraftUsernameAvailable,
  isRedsouthUsernameAvailable,
  isValidUsernameFormat,
  validatePasswordStrength,
} from "@/lib/userProfile";
import { formatErrorMessage } from "@/lib/utils";
import { MinecraftOnboarding } from "@/components/auth/MinecraftOnboarding";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type AuthMode = "login" | "register" | "forgot";

function resolveMode(pathname: string): AuthMode {
  if (pathname === "/register" || pathname === "/auth/signup") return "register";
  if (pathname === "/forgot-password" || pathname === "/auth/reset-password") return "forgot";
  return "login";
}

export function Auth() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firebaseUser, profile, isLoading, isSettingUpProfile, setProfile, setSettingUpProfile } = useAuthStore();

  const redirectParam = searchParams.get("redirect");
  const redirectTarget = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/account";

  const [mode, setMode] = useState<AuthMode>(() => resolveMode(location.pathname));
  const [rsUsername, setRsUsername] = useState("");
  const [sameForMc, setSameForMc] = useState(true);
  const [mcUsername, setMcUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOAuth, setLoadingOAuth] = useState<"google" | "github" | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Availability states for registration
  const [isCheckingRs, setIsCheckingRs] = useState(false);
  const [isRsFree, setIsRsFree] = useState<boolean | null>(null);
  const [isCheckingMc, setIsCheckingMc] = useState(false);
  const [isMcFree, setIsMcFree] = useState<boolean | null>(null);

  const effectiveMcUsername = sameForMc ? rsUsername : mcUsername;
  const isRsFormatValid = isValidUsernameFormat(rsUsername);
  const isMcFormatValid = isValidUsernameFormat(effectiveMcUsername);
  const passwordStrength = validatePasswordStrength(password);

  useEffect(() => {
    setMode(resolveMode(location.pathname));
    setForgotSent(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mode === "login") {
      document.title = `REDSOUTH Studio — ${t("header.login", "Log In")}`;
    } else if (mode === "register") {
      document.title = `REDSOUTH Studio — ${t("header.register", "Register")}`;
    } else {
      document.title = `REDSOUTH Studio — ${t("auth.forgot_password", "Forgot Password")}`;
    }
  }, [mode, t]);

  useEffect(() => {
    if (
      !isLoading &&
      firebaseUser &&
      profile &&
      isValidUsernameFormat(profile.username) &&
      isValidUsernameFormat(profile.redsouth_username)
    ) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isLoading, firebaseUser, profile, navigate, redirectTarget]);

  useEffect(() => {
    if (mode !== "register" || !isRsFormatValid) {
      setIsRsFree(null);
      setIsCheckingRs(false);
      return;
    }
    let cancelled = false;
    setIsCheckingRs(true);
    const timer = setTimeout(async () => {
      try {
        const free = await isRedsouthUsernameAvailable(rsUsername);
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
  }, [rsUsername, mode, isRsFormatValid]);

  useEffect(() => {
    if (mode !== "register" || !isMcFormatValid) {
      setIsMcFree(null);
      setIsCheckingMc(false);
      return;
    }
    let cancelled = false;
    setIsCheckingMc(true);
    const timer = setTimeout(async () => {
      try {
        const free = await isMinecraftUsernameAvailable(effectiveMcUsername);
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
  }, [effectiveMcUsername, mode, isMcFormatValid]);

  if (isLoading || isSettingUpProfile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!isSubmitting && firebaseUser && (!profile || !isValidUsernameFormat(profile.username))) {
    return <MinecraftOnboarding onComplete={() => navigate(redirectTarget, { replace: true })} />;
  }

  const handleOAuth = async (providerName: "google" | "github") => {
    if (loadingOAuth || isSubmitting) return;
    setLoadingOAuth(providerName);
    try {
      const provider = providerName === "google" ? googleProvider : githubProvider;
      const cred = await signInWithPopup(auth, provider);
      const existingProfile = await getUserProfile(cred.user.uid);
      if (existingProfile && isValidUsernameFormat(existingProfile.username)) {
        setProfile(existingProfile);
        toast.success(t("auth.login_success", "Login successful!"));
        navigate(redirectTarget, { replace: true });
      }
    } catch (error: any) {
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        return;
      }
      console.error("OAuth login error:", error);
      toast.error(formatErrorMessage(error, "OAuth sign-in failed."));
    } finally {
      setLoadingOAuth(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode === "forgot") {
      if (!email.trim()) return;
      setIsSubmitting(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setForgotSent(true);
        toast.success(t("auth.forgot_password_sent", "Password reset email sent! Check your inbox."));
      } catch (error: any) {
        toast.error(formatErrorMessage(error, t("auth.forgot_password_error", "Failed to send reset email.")));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === "register") {
      if (!isRsFormatValid || !isMcFormatValid) {
        toast.error(t("onboarding.invalid_format", "Usernames must be 3 to 16 characters (letters, numbers, underscores)."));
        return;
      }
      if (!passwordStrength.isValid) {
        toast.error(t("auth.password_weak_error", "Password must meet all security requirements."));
        return;
      }

      setIsSubmitting(true);
      setSettingUpProfile(true);
      try {
        const [rsFree, mcFree] = await Promise.all([
          isRedsouthUsernameAvailable(rsUsername),
          isMinecraftUsernameAvailable(effectiveMcUsername),
        ]);
        if (!rsFree) {
          toast.error(t("onboarding.rs_taken", "This REDSOUTH username is already taken."));
          return;
        }
        if (!mcFree) {
          toast.error(t("onboarding.taken", "This Minecraft username is already taken."));
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const createdProfile = await createInitialUserProfile(cred.user, {
          redsouthUsername: rsUsername,
          minecraftUsername: effectiveMcUsername,
        });
        setProfile(createdProfile);

        // Send verification email automatically
        sendEmailVerification(cred.user).catch(() => {});

        toast.success(
          t("auth.register_success_verify", "Account created! Check your email to verify your address.")
        );
        navigate(redirectTarget, { replace: true });
      } catch (error: any) {
        console.error("Register error:", error);
        toast.error(formatErrorMessage(error, "Registration failed."));
      } finally {
        setSettingUpProfile(false);
        setIsSubmitting(false);
      }
      return;
    }

    // Login
    setIsSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const existingProfile = await getUserProfile(cred.user.uid);
      if (existingProfile && isValidUsernameFormat(existingProfile.username)) {
        setProfile(existingProfile);
        toast.success(t("auth.login_success", "Login successful!"));
        navigate(redirectTarget, { replace: true });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(formatErrorMessage(error, "Sign-in failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectQuery = redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : "";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
      <Card className="w-full border-foreground/10 bg-background/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2">
            <img src="/account-banner.svg" alt="REDSOUTH Account" className="h-10 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "login" && t("auth.login_title", "Welcome back")}
            {mode === "register" && t("auth.register_title", "Create your REDSOUTH Account")}
            {mode === "forgot" && t("auth.forgot_password_title", "Reset Password")}
          </CardTitle>
          <CardDescription>
            {mode === "login" && t("auth.login_desc", "Sign in to access REDSOUTH & ONE Launcher.")}
            {mode === "register" && t("auth.register_desc", "Create an account for web, skins, and ONE Launcher.")}
            {mode === "forgot" && t("auth.forgot_password_desc", "Enter your email address and we'll send you a reset link.")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {mode !== "forgot" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!!loadingOAuth || isSubmitting}
                  onClick={() => handleOAuth("google")}
                  className="w-full bg-background/50 hover:bg-background border-foreground/10"
                >
                  {loadingOAuth === "google" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!!loadingOAuth || isSubmitting}
                  onClick={() => handleOAuth("github")}
                  className="w-full bg-background/50 hover:bg-background border-foreground/10"
                >
                  {loadingOAuth === "github" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  )}
                  GitHub
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-foreground/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t("auth.or_continue_with", "Or continue with email")}
                  </span>
                </div>
              </div>
            </>
          )}

          {mode === "forgot" && forgotSent ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("auth.forgot_password_sent", "Password reset email sent! Check your inbox.")}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to={`/login${redirectQuery}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("auth.back_to_login", "Back to Sign In")}
                </Link>
              </Button>
            </div>
          ) : (
            <form className="flex flex-col" onSubmit={handleSubmit}>
              <AnimatePresence initial={false}>
                {mode === "register" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pb-4">
                      {/* REDSOUTH Username */}
                      <div className="space-y-1.5">
                        <label htmlFor="rs-username" className="text-sm font-medium leading-none">
                          {t("onboarding.redsouth_username_label", "REDSOUTH Username")}
                        </label>
                        <div className="relative">
                          <Input
                            id="rs-username"
                            type="text"
                            placeholder="redsouth_player"
                            maxLength={16}
                            value={rsUsername}
                            onChange={(e) => setRsUsername(e.target.value)}
                            required={mode === "register"}
                            className="pr-10 bg-background/50 border-foreground/10 focus-visible:ring-red-500"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isCheckingRs && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {!isCheckingRs && isRsFormatValid && isRsFree === true && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                            {!isCheckingRs && isRsFormatValid && isRsFree === false && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        {!isCheckingRs && isRsFormatValid && isRsFree === false && (
                          <p className="text-xs text-red-500 font-medium">
                            {t("onboarding.rs_taken", "This REDSOUTH username is already taken.")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="same-for-mc-register"
                          checked={sameForMc}
                          onCheckedChange={(checked) => setSameForMc(checked === true)}
                        />
                        <Label
                          htmlFor="same-for-mc-register"
                          className="text-xs font-normal text-muted-foreground cursor-pointer select-none"
                        >
                          {t("onboarding.same_for_mc", "Use the same username for Minecraft")}
                        </Label>
                      </div>

                      {!sameForMc && (
                        <div className="space-y-1.5">
                          <label htmlFor="mc-username" className="text-sm font-medium leading-none">
                            {t("onboarding.username_label", "Minecraft Username")}
                          </label>
                          <div className="relative">
                            <Input
                              id="mc-username"
                              type="text"
                              placeholder="Steve_123"
                              maxLength={16}
                              value={mcUsername}
                              onChange={(e) => setMcUsername(e.target.value)}
                              required={mode === "register" && !sameForMc}
                              className="pr-10 bg-background/50 border-foreground/10 focus-visible:ring-red-500"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isCheckingMc && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              {!isCheckingMc && isMcFormatValid && isMcFree === true && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              )}
                              {!isCheckingMc && isMcFormatValid && isMcFree === false && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                          {!isCheckingMc && isMcFormatValid && isMcFree === false && (
                            <p className="text-xs text-red-500 font-medium">
                              {t("onboarding.taken", "This Minecraft username is already taken.")}
                            </p>
                          )}
                        </div>
                      )}

                      {sameForMc && !isCheckingMc && isMcFormatValid && isMcFree === false && (
                        <p className="text-xs text-red-500 font-medium">
                          {t("onboarding.taken", "This Minecraft username is already taken. Uncheck above to pick a different one.")}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {t("onboarding.rules", "3–16 characters: letters, numbers, and underscores (_) only.")}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  {t("auth.email", "Email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="player@redsouth.eu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 border-foreground/10 focus-visible:ring-red-500"
                />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-sm font-medium leading-none">
                      {t("auth.password", "Password")}
                    </label>
                    {mode === "login" && (
                      <Link
                        to={`/forgot-password${redirectQuery}`}
                        className="text-xs text-red-500 hover:text-red-400 hover:underline"
                      >
                        {t("auth.forgot_password", "Forgot password?")}
                      </Link>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "register" ? 8 : 6}
                    className="bg-background/50 border-foreground/10 focus-visible:ring-red-500"
                  />
                  {mode === "register" && <PasswordChecklist password={password} />}
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !!loadingOAuth ||
                  (mode === "register" && !passwordStrength.isValid)
                }
                className="w-full relative group border-0 overflow-hidden bg-white hover:bg-white shadow-lg mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#FF9D00] transition-opacity duration-500 group-hover:opacity-0" />
                <div className="relative flex items-center justify-center w-full">
                  <span className="font-bold text-white transition-opacity duration-500 group-hover:opacity-0 flex items-center gap-2">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "login" && t("header.login", "Log In")}
                    {mode === "register" && t("header.register", "Register")}
                    {mode === "forgot" && t("auth.send_reset_link", "Send Reset Link")}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center font-bold bg-gradient-to-r from-[#FF0000] to-[#FF9D00] bg-clip-text text-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 flex items-center gap-2">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" />}
                    {mode === "login" && t("header.login", "Log In")}
                    {mode === "register" && t("header.register", "Register")}
                    {mode === "forgot" && t("auth.send_reset_link", "Send Reset Link")}
                  </span>
                </div>
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <p>
              {t("auth.no_account", "Don't have an account?")}{" "}
              <Link to={`/register${redirectQuery}`} className="font-semibold text-foreground hover:text-red-500 underline-offset-4 hover:underline">
                {t("header.register", "Register")}
              </Link>
            </p>
          )}
          {mode === "register" && (
            <p>
              {t("auth.has_account", "Already have an account?")}{" "}
              <Link to={`/login${redirectQuery}`} className="font-semibold text-foreground hover:text-red-500 underline-offset-4 hover:underline">
                {t("header.login", "Log In")}
              </Link>
            </p>
          )}
          {mode === "forgot" && (
            <p>
              <Link to={`/login${redirectQuery}`} className="font-semibold text-foreground hover:text-red-500 underline-offset-4 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.back_to_login", "Back to Sign In")}
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
      </motion.div>
    </div>
  );
}
