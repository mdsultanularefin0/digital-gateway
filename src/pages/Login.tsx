import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setShowOtp(true);
        toast({ title: "Check your email", description: "We sent you a 6-digit verification code." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        navigate("/admin");
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
      toast({ title: "Success", description: "Email verified! You are now signed in." });
      navigate("/");
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
            <div className="rounded-xl border border-border bg-card p-8 shadow-card">
              <h1 className="text-2xl font-display font-bold text-center mb-2">
                Verify Your Email
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-2">
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
                  {loading ? "Verifying..." : "Verify Email"}
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
          <div className="rounded-xl border border-border bg-card p-8 shadow-card">
            <h1 className="text-2xl font-display font-bold text-center mb-2">
              {isSignUp ? "Create Account" : "Sign In"}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              {isSignUp ? "Create your account to get started" : "Sign in to access the admin panel"}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              <Button variant="gradient" size="lg" type="submit" disabled={loading}>
                {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            {!isSignUp && (
              <div className="mt-4 text-center">
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
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
