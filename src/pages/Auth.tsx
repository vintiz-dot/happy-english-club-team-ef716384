import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  Lock,
  Mail,
  Trophy,
  Flame,
  Star,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// What a visitor may say they are when they join. It is a note for the school
// and nothing more: the database gives every self-made account the student
// role and no access to any child until an admin links it (migration
// 20261113100000). Staff accounts are created by an admin, never here.
type UserRole = "family" | "student";

// The only demo account permitted in this app. It is a student-role sandbox
// (own-row RLS + enrolled solely in "Demo Class"), locked behind a password
// an admin sets in the dashboard. Never add a privileged demo account: this
// deployment holds real student and family records.
const DEMO_STUDENT_EMAIL = "student@demo.com";

/**
 * True for a school-issued login handle like `hanh@hanh.com`, where the local
 * part matches the domain label. Those addresses are minted by the front-desk
 * recovery flow for families with no email; nothing is ever delivered to them
 * and the school does not own the domain, so password-reset mail must not be
 * sent. Recovery for these accounts is a new access card from the school.
 */
function isSchoolIssuedHandle(email: string): boolean {
  const m = /^([^@\s]+)@([^@\s.]+)\.com$/i.exec(email.trim());
  if (!m) return false;
  // hanh@hanh.com and hanh2@hanh.com both belong to the same generated family.
  return m[1].toLowerCase().replace(/\d+$/, "") === m[2].toLowerCase();
}

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [checkingAdmins, setCheckingAdmins] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const nextParam = new URLSearchParams(location.search).get("next");
  const oauthNext = nextParam ? oauthReturnPath(nextParam) : null;
  const afterAuth = () => oauthNext ?? (location.state as { redirectTo?: string } | null)?.redirectTo ?? "/dashboard";

  useEffect(() => {
    if (user) {
      navigate(afterAuth(), { replace: true });
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

  // Demo access is a STUDENT sandbox account only, gated by a password an
  // admin sets in the dashboard. Nothing is hardcoded here: this app holds
  // real student and family data, so there is no privileged demo and no
  // credential in the source. There is also no client-side provisioning —
  // if the demo is disabled, sign-in simply fails.
  const handleDemoLogin = async (demoPass: string) => {
    if (!demoPass) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_STUDENT_EMAIL,
        password: demoPass,
      });
      if (error) {
        throw new Error(
          "That demo password isn't right, or the demo is currently switched off. Please contact us for access.",
        );
      }
      toast.success("Welcome to the demo!");
      navigate("/student/dashboard");
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
        navigate(afterAuth());
      } else if (mode === "forgot") {
        // School-issued handles look like hanh@hanh.com — the local part and
        // the domain match. Those domains are NOT owned by the school and
        // have no mailbox, so a reset mail would either vanish or, worse, be
        // delivered to whoever actually owns that domain. Refuse locally.
        //
        // This is a pure string check on what the user typed: it performs no
        // lookup and so cannot be used to probe which accounts exist.
        if (isSchoolIssuedHandle(email)) {
          toast.error("This is a school login", {
            description:
              "There's no mailbox for this address, so we can't email you a reset. Ask the school for a new access card.",
          });
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset email sent! Check your inbox.");
        setMode("login");
      } else {
        const redirectUrl = oauthNext ? new URL(oauthNext, window.location.origin).href : `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { role } },
        });
        if (error) throw error;
        toast.success("Account created!");
        navigate(afterAuth());
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmins) {
    return (
      <div className="min-h-screen bg-hec-paper flex items-center justify-center px-4">
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-8 shadow-hec-1">
          <div className="flex items-center gap-3 text-hec-ink">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-hec-line border-t-hec-ink" />
            <span className="text-hec-body font-medium">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  const headline =
    mode === "login" ? "Welcome back" : mode === "signup" ? "Join the club" : "Reset password";
  const subhead =
    mode === "login"
      ? "Sign in with your school account."
      : mode === "signup"
      ? "Start your learning quest today."
      : "We'll send a reset link to your inbox.";

  return (
    <div className="min-h-screen bg-hec-paper text-hec-ink grid lg:grid-cols-2 overflow-x-clip">
      {/* ───── LEFT — brand panel (desktop only) ───── */}
      <aside className="relative hidden lg:flex flex-col justify-between gap-8 border-r border-hec-line bg-hec-surface p-12">
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-hec-lg border border-hec-line bg-hec-raised flex items-center justify-center overflow-hidden p-1">
              <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-contain rounded-hec-md" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-hec-h2 font-medium text-hec-ink">Happy English Club</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-8 max-w-md">
          <div>
            <h2 className="font-display text-hec-display font-medium text-hec-ink">
              Your school day starts here.
            </h2>
            <p className="mt-4 text-hec-body text-hec-ink-soft">
              Lessons, progress and school news for students, families and staff.
            </p>
          </div>

          {/* Three quiet tiles: what the school offers */}
          <div className="grid grid-cols-3 gap-3">
            <FeatureTile icon={Trophy} label="Lessons and homework" tone="amber" />
            <FeatureTile icon={Flame} label="Progress for families" tone="rose" />
            <FeatureTile icon={Star} label="Class schedule" tone="violet" />
          </div>
        </div>

        <div className="relative text-hec-caption text-hec-ink-faint">
          © {new Date().getFullYear()} Happy English Club · Crafted with care.
        </div>
      </aside>

      {/* ───── RIGHT — form panel ───── */}
      <main className="relative flex items-center justify-center px-4 py-8 sm:p-8 lg:p-12 bg-hec-paper text-hec-ink min-h-screen lg:min-h-0">
        <div className="relative w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-hec-lg border border-hec-line bg-hec-raised flex items-center justify-center overflow-hidden p-1">
              <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-contain rounded-hec-md" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-hec-h3 font-medium text-hec-ink">Happy English Club</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-8">
            <h1 className="font-display text-hec-display font-medium text-hec-ink">{headline}</h1>
            <p className="mt-2 text-hec-body text-hec-ink-soft">{subhead}</p>
          </div>

          {/* Bootstrap notice */}
          {showBootstrap && (
            <div className="mb-6 rounded-hec-lg border border-hec-warn/30 bg-hec-warn-tint p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 shrink-0 text-hec-warn mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-hec-small font-semibold text-hec-ink mb-1">System setup required</p>
                  <p className="text-hec-caption text-hec-ink-soft mb-3">
                    No admin account exists yet. Create the first one to get started.
                  </p>
                  <Button
                    onClick={handleBootstrap}
                    disabled={bootstrapping}
                    className="w-full"
                  >
                    {bootstrapping ? "Setting up…" : "Create First Admin"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-hec-small font-medium text-hec-ink"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hec-ink-faint" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-hec-small font-medium text-hec-ink"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hec-ink-faint" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="signup-role" className="text-hec-small font-medium text-hec-ink">
                  I am a
                </Label>
                <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                  <SelectTrigger id="signup-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-hec-caption text-hec-ink-soft">
                  {role === "student"
                    ? "Choose this if you are learning at HEC."
                    : "The school will link your account to your child."}
                </p>
                <p className="text-hec-caption text-hec-ink-soft">
                  Teachers and staff: the school creates your login.
                </p>
              </div>
            )}

            {mode === "login" && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="link"
                  className="text-hec-small font-semibold"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 rounded-full border-2 border-hec-on-action/40 border-t-hec-on-action" />
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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-1 text-center text-hec-small">
            {mode === "login" ? (
              <>
                <span className="text-hec-ink-soft">New to the club?</span>{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="inline-flex min-h-hec-target items-center rounded-hec-sm px-2 font-semibold text-hec-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                <span className="text-hec-ink-soft">Already have an account?</span>{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="inline-flex min-h-hec-target items-center rounded-hec-sm px-2 font-semibold text-hec-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Access card redemption.
              The whole point of the front-desk card is that the family has
              lost BOTH their password and the email they signed up with — so
              every other route on this page is closed to them. The card was
              printed with a web address but nothing here pointed at /claim,
              which left the holder of a valid code with no way in. In "forgot"
              mode this is the likeliest answer, so it is stated plainly. */}
          {mode !== "signup" && (
            <div className="mt-6 pt-6 border-t border-hec-line">
              <Link
                to="/claim"
                className="flex min-h-hec-target items-center gap-3 rounded-hec-lg border border-hec-line bg-hec-surface px-4 py-3 shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
              >
                <KeyRound className="h-5 w-5 shrink-0 text-hec-brass" />
                <span className="min-w-0">
                  <span className="block text-hec-small font-semibold text-hec-ink">
                    Have a school access card?
                  </span>
                  <span className="block text-hec-caption text-hec-ink-soft">
                    {mode === "forgot"
                      ? "Forgot your email too? Use the code on your access card instead."
                      : "Use the code on your card to set a new password."}
                  </span>
                  <span className="mt-1 block text-hec-small font-semibold text-hec-brass">
                    Use my access code
                  </span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-hec-ink-soft" />
              </Link>
            </div>
          )}

          {/* Demo access — STUDENT ONLY, and only with the password an admin
              set. This is a live app holding real student and family data:
              there is deliberately no admin/teacher/family demo, and no
              password is published here or anywhere in the source. */}
          <details className="group mt-8 pt-6 border-t border-hec-line">
            <summary className="flex min-h-hec-target cursor-pointer list-none items-center justify-center rounded-hec-sm text-hec-small font-semibold text-hec-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring [&::-webkit-details-marker]:hidden">
              Explore the student demo
            </summary>
            <div className="mt-3">
              <p className="text-hec-caption text-center text-hec-ink-soft mb-3">
                Ask us for the demo password — the demo is a sample student account with fictional data.
              </p>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Demo password"
                  aria-label="Demo password"
                  value={demoPassword}
                  onChange={(e) => setDemoPassword(e.target.value)}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDemoLogin(demoPassword)}
                  disabled={loading || demoPassword.length < 4}
                >
                  Enter student demo
                </Button>
              </div>
            </div>
          </details>

          {/* Trust marker */}
          <div className="mt-6 flex items-center justify-center gap-2 text-hec-caption text-hec-ink-faint">
            <Sparkles className="h-4 w-4 shrink-0" />
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
  // One quiet look for all three: brass marks the reward icons (DESIGN_SYSTEM s.18); the tone names stay.
  const map = {
    amber: "text-hec-brass",
    rose: "text-hec-brass",
    violet: "text-hec-brass",
  } as const;
  return (
    <div
      className="rounded-hec-lg border border-hec-line bg-hec-sunken p-3 text-center"
    >
      <Icon className={`h-5 w-5 mx-auto mb-2 ${map[tone]}`} />
      <p className="text-hec-caption font-medium text-hec-ink-soft">{label}</p>
    </div>
  );
}

export default Auth;
