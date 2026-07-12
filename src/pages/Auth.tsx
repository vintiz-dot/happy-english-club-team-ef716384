import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  Trophy,
  Flame,
  Star,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type UserRole = "admin" | "teacher" | "family" | "student";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [checkingAdmins, setCheckingAdmins] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const state = location.state as { redirectTo?: string } | null;
      navigate(state?.redirectTo || "/dashboard", { replace: true });
    }
  }, [user, navigate, location]);

  const checkForAdmins = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "checkAdmins" },
      });
      if (!error) setShowBootstrap(!data.hasAdmins);
    } catch (e) {
      console.error("Error checking for admins:", e);
    } finally {
      setCheckingAdmins(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "bootstrap" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.temporaryPassword && data.email) {
        toast.success(
          `Admin account created!\n\nEmail: ${data.email}\nTemporary Password: ${data.temporaryPassword}\n\nPlease save these credentials and change the password immediately!`,
          { duration: 30000 }
        );
        setEmail(data.email);
        setShowBootstrap(false);
        setMode("login");
      } else {
        throw new Error("Bootstrap failed - no credentials returned from server");
      }
    } catch (error: any) {
      toast.error("Bootstrap failed: " + error.message);
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    checkForAdmins();
  }, []);

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
      if (error) throw error;
      toast.success("Welcome to the demo!");
      const state = location.state as { redirectTo?: string } | null;
      navigate(state?.redirectTo || "/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        const state = location.state as { redirectTo?: string } | null;
        navigate(state?.redirectTo || "/dashboard");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset email sent! Check your inbox.");
        setMode("login");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { role } },
        });
        if (error) throw error;
        toast.success("Account created!");
        const state = location.state as { redirectTo?: string } | null;
        navigate(state?.redirectTo || "/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmins) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <div className="rounded-2xl bg-white/10 backdrop-blur-md p-8 ring-1 ring-white/20">
          <div className="flex items-center gap-3 text-white">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
            <span className="font-medium">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  const headline =
    mode === "login" ? "Welcome back" : mode === "signup" ? "Join the club" : "Reset password";
  const subhead =
    mode === "login"
      ? "Pick up where you left off."
      : mode === "signup"
      ? "Start your learning quest today."
      : "We'll send a reset link to your inbox.";

  return (
    <div className="min-h-screen bg-night text-white grid lg:grid-cols-2 overflow-hidden">
      {/* ───── LEFT — brand panel (desktop only) ───── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden">
        {/* aurora accents */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-aurora flex items-center justify-center shadow-q3 overflow-hidden p-1">
              <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-contain rounded-xl" />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/60">
                Happy English Club
              </p>
              <p className="text-lg font-extrabold">Learning, levelled up.</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-8 max-w-md">
          <div>
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Earn XP. <span className="text-aurora">Climb ranks.</span>{" "}
              Level up your English.
            </h2>
            <p className="mt-4 text-white/70 text-base xl:text-lg leading-relaxed">
              Track every quest, celebrate every grade, and watch your streak grow.
            </p>
          </div>

          {/* Floating stat tiles for vibe */}
          <div className="grid grid-cols-3 gap-3">
            <FeatureTile icon={Trophy} label="Class Arena" tone="amber" />
            <FeatureTile icon={Flame} label="Streaks" tone="rose" />
            <FeatureTile icon={Star} label="Achievements" tone="violet" />
          </div>
        </div>

        <div className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Happy English Club · Crafted with care.
        </div>
      </aside>

      {/* ───── RIGHT — form panel ───── */}
      <main className="relative flex items-center justify-center p-5 sm:p-8 lg:p-12 bg-background text-foreground min-h-screen lg:min-h-0">
        {/* subtle gradient header on mobile to keep brand visible */}
        <div className="absolute inset-x-0 top-0 h-40 bg-aurora opacity-10 lg:hidden" />

        <div className="relative w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-aurora flex items-center justify-center shadow-q3 overflow-hidden p-1">
              <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-contain rounded-xl" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                Happy English Club
              </p>
              <p className="text-base font-extrabold">Learning, levelled up.</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-7">
            <h1 className="type-display">{headline}</h1>
            <p className="type-body text-muted-foreground mt-1.5">{subhead}</p>
          </div>

          {/* Bootstrap notice */}
          {showBootstrap && (
            <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">System setup required</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    No admin account exists yet. Create the first one to get started.
                  </p>
                  <Button
                    onClick={handleBootstrap}
                    disabled={bootstrapping}
                    className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-white font-semibold"
                  >
                    {bootstrapping ? "Setting up…" : "Create First Admin"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-10 rounded-xl text-[15px]"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 pl-10 rounded-xl text-[15px]"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  I am a
                </Label>
                <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                  <SelectTrigger className="h-12 rounded-xl text-[15px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(c as boolean)}
                  />
                  <span className="text-sm font-medium">Remember me</span>
                </label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm font-semibold text-blue-600 dark:text-blue-300"
                  onClick={() => setMode("forgot")}
                >
                  Forgot?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-aurora text-white font-bold shadow-q3 hover:opacity-95 active:scale-[0.99] transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                  Processing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Mode toggle */}
          <div className="mt-7 text-center text-sm">
            {mode === "login" ? (
              <>
                <span className="text-muted-foreground">New to the club?</span>{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-bold text-blue-600 dark:text-blue-300 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Already have an account?</span>{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-bold text-blue-600 dark:text-blue-300 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Demo Login Section */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-sm font-semibold text-center mb-4 text-white/80">Try a demo account</p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                onClick={() => handleDemoLogin('admin@demo.com', 'admin123')}
                disabled={loading}
              >
                Admin Demo
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                onClick={() => handleDemoLogin('teacher@demo.com', 'teacher123')}
                disabled={loading}
              >
                Teacher Demo
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                onClick={() => handleDemoLogin('student@demo.com', 'student123')}
                disabled={loading}
              >
                Student Demo
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                onClick={() => handleDemoLogin('family@demo.com', 'family123')}
                disabled={loading}
              >
                Family Demo
              </Button>
            </div>
          </div>

          {/* Trust marker */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Secure authentication powered by Supabase</span>
          </div>
        </div>
      </main>
    </div>
  );
};

function FeatureTile({
  icon: Icon,
  label,
  tone,
}: {
  icon: any;
  label: string;
  tone: "amber" | "rose" | "violet";
}) {
  const map = {
    amber: "from-amber-400/30 to-orange-500/20 text-amber-200",
    rose: "from-rose-400/30 to-sky-500/20 text-rose-200",
    violet: "from-blue-400/30 to-indigo-500/20 text-blue-200",
  } as const;
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${map[tone]} ring-1 ring-white/10 p-3 text-center backdrop-blur-md`}
    >
      <Icon className="h-5 w-5 mx-auto mb-1.5" />
      <p className="text-[11px] font-semibold text-white/90">{label}</p>
    </div>
  );
}

export default Auth;
