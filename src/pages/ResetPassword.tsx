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
      <div className="min-h-screen bg-hec-paper text-hec-ink flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-8 shadow-hec-1 text-center">
            <div className="flex items-center justify-center gap-3 text-hec-ink mb-4">
              <div className="animate-spin rounded-full h-6 w-6 shrink-0 border-2 border-hec-line border-t-hec-ink" />
              <span className="text-hec-body font-medium">Verifying reset link…</span>
            </div>
            <p className="text-hec-small text-hec-ink-soft">
              If this takes too long, your reset link may have expired.{" "}
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex min-h-hec-target items-center rounded-hec-sm px-1 font-semibold text-hec-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
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
      <div className="min-h-screen bg-hec-paper text-hec-ink flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-8 shadow-hec-1">
            <div className="mx-auto h-16 w-16 rounded-full border border-hec-leaf/30 bg-hec-leaf-tint flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-hec-leaf" />
            </div>
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink mb-2">Password Updated!</h1>
            <p className="text-hec-small text-hec-ink-soft mb-4">
              Your password has been changed successfully. Redirecting you to the dashboard…
            </p>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-hec-line border-t-hec-ink mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Main form ----
  return (
    <div className="min-h-screen bg-hec-paper text-hec-ink flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-hec-lg border border-hec-line bg-hec-raised flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-hec-brass" />
          </div>
          <div className="min-w-0">
            <p className="text-hec-caption font-medium tracking-wider uppercase text-hec-ink-soft">
              Happy English Club
            </p>
            <p className="font-display text-hec-h3 font-medium text-hec-ink">Set new password</p>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-8">
          <h1 className="font-display text-hec-display font-medium text-hec-ink">Choose a new password</h1>
          <p className="mt-2 text-hec-body text-hec-ink-soft">
            Enter a strong password to secure your account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New password */}
          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className="text-hec-small font-medium text-hec-ink"
            >
              New Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hec-ink-faint" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
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
                      className={`h-1 flex-1 rounded-full transition-colors duration-hec-1 ease-hec ${
                        password.length >= i * 3
                          ? password.length >= 10
                            ? "bg-hec-leaf"
                            : password.length >= 8
                              ? "bg-hec-warn"
                              : "bg-hec-danger-fill"
                          : "bg-hec-sunken"
                      }`}
                    />
                  ))}
                </div>
                <span className="shrink-0 text-hec-caption text-hec-ink-soft">
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
          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-hec-small font-medium text-hec-ink"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hec-ink-faint" />
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={`pl-10 pr-12 ${
                  confirmPassword.length > 0 && !passwordsMatch
                    ? "border-hec-danger"
                    : confirmPassword.length > 0 && passwordsMatch
                      ? "border-hec-leaf"
                      : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-hec-caption text-hec-danger mt-1">Passwords don't match</p>
            )}
            {confirmPassword.length > 0 && passwordsMatch && passwordValid && (
              <p className="text-hec-caption text-hec-leaf mt-1 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 shrink-0" /> Passwords match
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 rounded-full border-2 border-hec-on-action/40 border-t-hec-on-action" />
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
            className="inline-flex min-h-hec-target items-center rounded-hec-sm px-3 text-hec-small text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
