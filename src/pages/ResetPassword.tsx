import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GraduationCap,
  Lock,
  CheckCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Wait for Supabase to process the recovery token from the URL hash.
  // The onAuthStateChange listener in useAuth will fire a PASSWORD_RECOVERY
  // event and set the session, which means the user is authenticated and
  // can call updateUser.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      },
    );

    // Also check if we already have a session (e.g. page refresh after
    // the recovery token was consumed).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Validation helpers
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast.success("Password updated successfully!");

      // Redirect to dashboard after a brief moment
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // ---- Loading state while Supabase processes the recovery token ----
  if (!ready) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-8 ring-1 ring-white/20 text-center">
            <div className="flex items-center justify-center gap-3 text-white mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
              <span className="font-medium">Verifying reset link…</span>
            </div>
            <p className="text-sm text-white/50">
              If this takes too long, your reset link may have expired.{" "}
              <button
                onClick={() => navigate("/auth")}
                className="text-blue-300 hover:underline font-semibold"
              >
                Request a new one
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Success state ----
  if (success) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center p-5">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-8 ring-1 ring-white/20">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Password Updated!</h1>
            <p className="text-white/60 text-sm mb-4">
              Your password has been changed successfully. Redirecting you to the dashboard…
            </p>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Main form ----
  return (
    <div className="min-h-screen bg-night text-white flex items-center justify-center p-5">
      {/* Aurora accents */}
      <div className="fixed -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-aurora flex items-center justify-center shadow-q3">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">
              Happy English Club
            </p>
            <p className="text-base font-extrabold">Set new password</p>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold tracking-tight">Choose a new password</h1>
          <p className="text-white/60 mt-1.5 text-sm">
            Enter a strong password to secure your account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="new-password"
              className="text-xs font-semibold tracking-wide uppercase text-white/50"
            >
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 pl-10 pr-10 rounded-xl text-[15px] bg-white/10 border-white/20 text-white placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? password.length >= 10
                            ? "bg-emerald-400"
                            : password.length >= 8
                              ? "bg-amber-400"
                              : "bg-rose-400"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/40">
                  {password.length < 6
                    ? "Too short"
                    : password.length < 8
                      ? "Fair"
                      : password.length < 10
                        ? "Good"
                        : "Strong"}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirm-password"
              className="text-xs font-semibold tracking-wide uppercase text-white/50"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={`h-12 pl-10 pr-10 rounded-xl text-[15px] bg-white/10 border-white/20 text-white placeholder:text-white/30 ${
                  confirmPassword.length > 0 && !passwordsMatch
                    ? "border-rose-500 ring-1 ring-rose-500/50"
                    : confirmPassword.length > 0 && passwordsMatch
                      ? "border-emerald-500 ring-1 ring-emerald-500/50"
                      : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-rose-400 mt-1">Passwords don't match</p>
            )}
            {confirmPassword.length > 0 && passwordsMatch && passwordValid && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-xl bg-aurora text-white font-bold shadow-q3 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                Updating…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Update Password
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Back to login link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
