import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || "Our Store";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setShowOtp(true);
        toast({ title: "Check your email", description: "We sent you a 6-digit verification code." });
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        toast({ title: "Welcome back!", description: "You have signed in successfully." });
        navigate(roleData ? "/admin" : "/account");
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome!", description: "Your account has been verified." });
      navigate("/account");
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code resent", description: "Check your email for a new verification code." });
    }
    setLoading(false);
  };

  if (showOtp) {
    return (
      <Layout>
        <section className="py-16 md:py-24">
          <div className="container max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-lg">
              <div className="flex justify-center mb-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-center mb-2">
                Verify Your Email
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-1">
                We sent a 6-digit code to
              </p>
              <p className="text-sm font-medium text-center mb-8">{email}</p>

              <div className="flex flex-col items-center gap-6">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-primary hover:underline"
                >
                  Didn't receive a code? Resend
                </button>

                <button
                  type="button"
                  onClick={() => { setShowOtp(false); setOtp(""); }}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  ← Back to sign up
                </button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-display font-bold mb-1">
                {isSignUp ? "Create Your Account" : `Welcome Back`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignUp
                  ? `Join ${siteName} to track orders & save your wishlist`
                  : "Sign in to your account to continue"}
              </p>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast({ title: "Error", description: String(error), variant: "destructive" });
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
                          return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Check your email", description: "We sent you a password reset link." });
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                {isSignUp && (
                  <p className="text-xs text-muted-foreground mt-1.5">Must be at least 6 characters</p>
                )}
              </div>

              <Button variant="gradient" size="lg" type="submit" disabled={loading} className="mt-2">
                {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary font-medium hover:underline"
                >
                  {isSignUp ? "Sign In" : "Create Account"}
                </button>
              </p>
            </div>
          </div>

          {/* Benefits for signup */}
          {isSignUp && (
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "📦", text: "Track Orders" },
                { icon: "❤️", text: "Save Wishlist" },
                { icon: "⚡", text: "Faster Checkout" },
              ].map((b) => (
                <div key={b.text} className="rounded-lg border border-border bg-card p-3">
                  <span className="text-lg">{b.icon}</span>
                  <p className="text-xs text-muted-foreground mt-1">{b.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
