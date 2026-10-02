import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { pb } from "@/lib/pb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Fingerprint } from "lucide-react";
import { authenticateWebAuthnPasskey, isPasskeySupported } from "@/lib/passkey";
import { formatErrorMessage } from "@/lib/utils";

export function Auth() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === "/auth/signin";
  
  const [isLogin, setIsLogin] = useState(isLoginRoute);
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>('github');
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  
  useEffect(() => {
    const title = isLogin ? t("header.login", "Log In") : t("header.register", "Register");
    document.title = `REDSOUTH Studio — ${title}`;
  }, [isLogin, t]);

  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  
  // 2FA Flow State
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pendingAuth, setPendingAuth] = useState<any>(null);

  useEffect(() => {
    setIsLogin(location.pathname === "/auth/signin");
  }, [location.pathname]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsSendingForgot(true);
    try {
      await pb.collection('users').requestPasswordReset(forgotEmail);
      toast.success(t('auth.forgot_password_success', 'If an account with this email exists, a password reset link has been sent.'));
      setShowForgotModal(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(formatErrorMessage(err, t('auth.forgot_password_error', 'Failed to request password reset')));
    } finally {
      setIsSendingForgot(false);
    }
  };

  const [isLoadingPasskey, setIsLoadingPasskey] = useState(false);
  const [loadingOAuthProvider, setLoadingOAuthProvider] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    setIsLoadingPasskey(true);
    try {
      const supported = await isPasskeySupported();
      if (!supported) {
        toast.error(t('auth.passkey_not_supported', 'Your device or browser does not support Passkeys.'));
        return;
      }

      // 1. Obtener opciones y desafío del servidor
      const res = await pb.send('/api/passkeys/auth/options', { method: 'POST' });
      
      // 2. Realizar la ceremonia biométrica en el navegador
      const credential = await authenticateWebAuthnPasskey({
        challenge: res.challenge,
        rpId: res.rpId,
        timeout: res.timeout,
        userVerification: res.userVerification,
      });

      // 3. Verificar y recibir token oficial de PocketBase
      const verifyRes = await pb.send('/api/passkeys/auth/verify', {
        method: 'POST',
        body: {
          challengeId: res.challengeId,
          id: credential.id,
          rawId: credential.rawId,
          type: credential.type,
          response: credential.response,
        },
      });

      if (verifyRes?.token && verifyRes?.record) {
        pb.authStore.save(verifyRes.token, verifyRes.record);
        try {
          await pb.collection('users').authRefresh();
        } catch (_) {}
        setLastUsedProvider('passkey');
        toast.success(t('auth.login_success', 'Login successful!'));
        navigate('/account');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User closed or dismissed the biometric prompt
        return;
      }
      console.error('Passkey login error:', err);
      toast.error(formatErrorMessage(err, t('auth.passkey_error', 'Failed to sign in with Passkey')));
    } finally {
      setIsLoadingPasskey(false);
    }
  };

  const handleOAuthClick = async (provider: string) => {
    if (loadingOAuthProvider) return;
    setLoadingOAuthProvider(provider);
    setLastUsedProvider(provider);

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
      const randomStr = Math.random().toString(36).substring(2, 10);
      const authData = await pb.collection('users').authWithOAuth2({ 
        provider,
        requestKey: `oauth_${provider}`,
        createData: {
          username: `user_${randomStr}`
        },
        urlCallback: (url: string) => {
          const width = 600;
          const height = 700;
          const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
          const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
          popupWindow = window.open(
            url,
            `oauth_${provider}`,
            `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
          );

          if (!popupWindow) {
            toast.error(t('auth.popup_blocked', 'Popup blocked. Please allow popups for this site.'));
            cleanupTimers();
            pb.cancelRequest(`oauth_${provider}`);
            setLoadingOAuthProvider(null);
            return;
          }

          // Monitor if user manually closes the popup window without completing login
          pollTimer = setInterval(() => {
            if (isCompleted || pb.authStore.isValid) {
              cleanupTimers();
              return;
            }

            if (popupWindow && popupWindow.closed && !closedTimer) {
              // Popup window closed. Wait 3 seconds grace period to allow redirect and token exchange to finish
              closedTimer = setTimeout(() => {
                if (!isCompleted && !pb.authStore.isValid) {
                  pb.cancelRequest(`oauth_${provider}`);
                  setLoadingOAuthProvider(null);
                }
                cleanupTimers();
              }, 3000);
            }
          }, 300);
        }
      });

      isCompleted = true;
      cleanupTimers();
      
      // Update username to provider username if available and newly generated
      if (authData?.meta?.username && authData.record?.username?.startsWith('user_')) {
        try {
          const updatedRecord = await pb.collection('users').update(authData.record.id, {
            username: authData.meta.username
          });
          pb.authStore.save(pb.authStore.token, updatedRecord);
        } catch (updateErr) {
          console.warn("Could not set provider username:", updateErr);
        }
      }
      
      toast.success(t('auth.login_success', { defaultValue: 'Login successful!' }));
      navigate("/account");
    } catch (error: any) {
      cleanupTimers();
      if (error?.name === 'AbortError' || error?.message?.includes('autocancelled') || error?.isAbort) {
        return;
      }
      console.error("OAuth login error:", error);
      toast.error(formatErrorMessage(error, 'OAuth login failed.'));
    } finally {
      cleanupTimers();
      setLoadingOAuthProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    
    try {
      if (isLogin) {
        await pb.collection('users').authWithPassword(username, password);
        toast.success(t('auth.login_success', { defaultValue: 'Login successful!' }));
      } else {
        await pb.collection('users').create({
          username,
          email,
          password,
          passwordConfirm: password,
          name
        });
        await pb.collection('users').authWithPassword(username, password);
        toast.success(t('auth.register_success', { defaultValue: 'Account created successfully!' }));
      }
      navigate("/account");
    } catch (error: any) {
      console.error("Auth error:", error, error?.data);
      
      const isTotpRequired = error?.message?.includes("TOTP_REQUIRED") || 
                             error?.response?.message?.includes("TOTP_REQUIRED") || 
                             error?.data?.message?.includes("TOTP_REQUIRED");
                             
      if (isTotpRequired) {
        // En PB v0.23, authWithPassword guarda el token parcial en authStore. 
        // Lo borramos para evitar que el router nos redirija a /account con una sesión rota.
        pb.authStore.clear(); 
        
        setPendingAuth({ username, password });
        setShowTotpModal(true);
        setIsLoadingAuth(false);
        return; // Stop flow and wait for modal
      }

      toast.error(formatErrorMessage(error, isLogin ? t('auth.invalid_credentials', 'Invalid credentials.') : t('auth.auth_failed', 'Registration failed.')));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleTotpSubmit = async (e?: React.FormEvent, code?: string) => {
    if (e) e.preventDefault();
    const finalCode = code || totpCode;
    if (!pendingAuth || finalCode.length !== 6) return;
    
    setIsLoadingAuth(true);
    try {
      if (pendingAuth.isOAuth) {
        pb.authStore.save(pendingAuth.token, pendingAuth.model);
        await pb.collection('users').authRefresh({
          headers: { 'X-Totp': finalCode }
        });
      } else {
        await pb.collection('users').authWithPassword(pendingAuth.username, pendingAuth.password, {
          headers: { 'X-Totp': finalCode }
        });
      }
      toast.success(t('auth.login_success', { defaultValue: 'Login successful!' }));
      setShowTotpModal(false);
      navigate("/account");
    } catch (error: any) {
      toast.error(formatErrorMessage(error, t('auth.totp_invalid', 'Invalid verification code.')));
      setTotpCode("");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-20 px-4">
      {/* Background with gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-background to-background"></div>
      
      <div className="container max-w-lg mx-auto relative">
        <Card className="border-foreground/5 bg-foreground/5 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img src="/account-banner.svg" alt="REDSOUTH Account" className="h-16 object-contain drop-shadow-md" />
            </div>
            <CardTitle className="text-2xl font-bold transition-all">
              {isLogin ? t('auth.login_title') : t('auth.register_title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground transition-all">
              {isLogin ? t('auth.login_subtitle') : t('auth.register_subtitle')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            
            {/* OAuth & Passkey Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  disabled={!!loadingOAuthProvider || isLoadingPasskey}
                  onClick={() => handleOAuthClick('github')}
                  className={`relative bg-background/50 hover:bg-background/80 ${lastUsedProvider === 'github' ? 'border-red-500/50' : 'border-foreground/10'}`}
                >
                  {lastUsedProvider === 'github' && (
                    <span className="absolute top-0 -translate-y-1/2 h-4 left-2 flex items-center justify-center bg-background text-muted-foreground text-[9px] uppercase font-medium px-1 rounded-full z-10">
                      {t('auth.last_used')}
                    </span>
                  )}
                  {loadingOAuthProvider === 'github' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  ) : (
                    <img src="/icons/oauth-github.svg" alt="GitHub" className="h-4 w-4" />
                  )}
                  GitHub
                </Button>
                <Button 
                  variant="outline" 
                  disabled={!!loadingOAuthProvider || isLoadingPasskey}
                  onClick={() => handleOAuthClick('discord')}
                  className={`relative bg-background/50 hover:bg-background/80 ${lastUsedProvider === 'discord' ? 'border-red-500/50' : 'border-foreground/10'}`}
                >
                  {lastUsedProvider === 'discord' && (
                    <span className="absolute top-0 -translate-y-1/2 h-4 left-2 flex items-center justify-center bg-background text-muted-foreground text-[9px] uppercase font-medium px-1 rounded-full z-10">
                      {t('auth.last_used')}
                    </span>
                  )}
                  {loadingOAuthProvider === 'discord' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  ) : (
                    <img src="/icons/oauth-discord.svg" alt="Discord" className="h-4 w-4" />
                  )}
                  Discord
                </Button>
                <Button 
                  variant="outline" 
                  disabled={!!loadingOAuthProvider || isLoadingPasskey}
                  onClick={() => handleOAuthClick('twitch')}
                  className={`relative bg-background/50 hover:bg-background/80 ${lastUsedProvider === 'twitch' ? 'border-red-500/50' : 'border-foreground/10'}`}
                >
                  {lastUsedProvider === 'twitch' && (
                    <span className="absolute top-0 -translate-y-1/2 h-4 left-2 flex items-center justify-center bg-background text-muted-foreground text-[9px] uppercase font-medium px-1 rounded-full z-10">
                      {t('auth.last_used')}
                    </span>
                  )}
                  {loadingOAuthProvider === 'twitch' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  ) : (
                    <img src="/icons/oauth-twitch.svg" alt="Twitch" className="h-4 w-4" />
                  )}
                  Twitch
                </Button>
                <Button 
                  variant="outline" 
                  disabled={!!loadingOAuthProvider || isLoadingPasskey}
                  onClick={() => handleOAuthClick('google')}
                  className={`relative bg-background/50 hover:bg-background/80 ${lastUsedProvider === 'google' ? 'border-red-500/50' : 'border-foreground/10'}`}
                >
                  {lastUsedProvider === 'google' && (
                    <span className="absolute top-0 -translate-y-1/2 h-4 left-2 flex items-center justify-center bg-background text-muted-foreground text-[9px] uppercase font-medium px-1 rounded-full z-10">
                      {t('auth.last_used')}
                    </span>
                  )}
                  {loadingOAuthProvider === 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  ) : (
                    <img src="/icons/oauth-google.svg" alt="Google" className="h-4 w-4" />
                  )}
                  Google
                </Button>
              </div>

              {isLogin && (
                <Button 
                  type="button"
                  variant="outline" 
                  disabled={isLoadingPasskey}
                  onClick={handlePasskeyLogin}
                  className={`w-full relative bg-background/50 hover:bg-background/80 gap-2 ${lastUsedProvider === 'passkey' ? 'border-red-500/50' : 'border-foreground/10'}`}
                >
                  {lastUsedProvider === 'passkey' && (
                    <span className="absolute top-0 -translate-y-1/2 h-4 left-2 flex items-center justify-center bg-background text-muted-foreground text-[9px] uppercase font-medium px-1 rounded-full z-10">
                      {t('auth.last_used')}
                    </span>
                  )}
                  {isLoadingPasskey ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  ) : (
                    <Fingerprint className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{t('auth.login_with_passkey')}</span>
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-foreground/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background/50 backdrop-blur-md px-2 text-muted-foreground rounded-full">
                  {t('auth.or_continue')}
                </span>
              </div>
            </div>

            <form className="flex flex-col" onSubmit={handleSubmit}>
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pb-4">
                      <label htmlFor="name" className="text-sm font-medium leading-none">
                        {t('auth.name')}
                      </label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="bg-background/50 border-foreground/10 focus-visible:ring-red-500" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium leading-none">
                  {t('auth.username')}
                </label>
                <Input 
                  id="username" 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-background/50 border-foreground/10 focus-visible:ring-red-500" 
                />
              </div>
              
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-4">
                      <label htmlFor="email" className="text-sm font-medium leading-none">
                        {t('auth.email')}
                      </label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="bg-background/50 border-foreground/10 focus-visible:ring-red-500" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-sm font-medium leading-none">
                    {t('auth.password')}
                  </label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setShowForgotModal(true)} 
                      className="text-xs text-red-500 hover:text-red-400 hover:underline"
                    >
                      {t('auth.forgot_password', 'Forgot password?')}
                    </button>
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bg-background/50 border-foreground/10 focus-visible:ring-red-500" 
                />
              </div>

              <Button type="submit" disabled={isLoadingAuth} className="w-full relative group border-0 overflow-hidden bg-white hover:bg-white shadow-lg mt-6">
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#FF9D00] transition-opacity duration-500 group-hover:opacity-0" />
                <div className="relative flex items-center justify-center w-full">
                  <span className="font-bold text-white transition-opacity duration-500 group-hover:opacity-0">
                    {isLoadingAuth ? '...' : isLogin ? t('auth.login_submit') : t('auth.register_submit')}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center font-bold bg-gradient-to-r from-[#FF0000] to-[#FF9D00] bg-clip-text text-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    {isLoadingAuth ? '...' : isLogin ? t('auth.login_submit') : t('auth.register_submit')}
                  </span>
                </div>
              </Button>
            </form>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
              {isLogin ? (
                <>
                  {t('auth.no_account')}{" "}
                  <Link to="/auth/signup" className="font-semibold text-foreground hover:text-red-500 transition-colors">
                    {t('auth.signup_link')}
                  </Link>
                </>
              ) : (
                <>
                  {t('auth.has_account')}{" "}
                  <Link to="/auth/signin" className="font-semibold text-foreground hover:text-red-500 transition-colors">
                    {t('auth.signin_link')}
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOTP Modal */}
      <Dialog open={showTotpModal} onOpenChange={setShowTotpModal}>
        <DialogContent 
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('auth.totp_modal_title', 'Two-Factor Authentication')}</DialogTitle>
            <DialogDescription>
              {t('auth.totp_modal_desc', 'Enter the 6-digit code from your authenticator app to continue.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTotpSubmit} className="space-y-6 pt-4">
            <div className="flex justify-center">
              <InputOTP 
                autoFocus 
                id="totp"
                name="totp"
                maxLength={6} 
                value={totpCode} 
                onChange={setTotpCode}
                onComplete={(val) => handleTotpSubmit(undefined, val)}
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
            </div>
            <DialogFooter className="sm:justify-between flex-row items-center">
              <Button type="button" variant="ghost" onClick={() => setShowTotpModal(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={totpCode.length !== 6 || isLoadingAuth}>
                {isLoadingAuth ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('auth.totp_modal_submit', 'Verify')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('auth.forgot_password_title', 'Reset password')}</DialogTitle>
            <DialogDescription>
              {t('auth.forgot_password_desc', 'Enter your email address and we will send you a link to reset your password.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="forgotEmail" className="text-sm font-medium leading-none">
                {t('auth.email', 'Email Address')}
              </label>
              <Input
                id="forgotEmail"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="bg-background/50 border-foreground/10 focus-visible:ring-red-500"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowForgotModal(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSendingForgot || !forgotEmail} className="bg-white text-black hover:bg-zinc-200">
                {isSendingForgot ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('auth.forgot_password_btn', 'Send link')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
