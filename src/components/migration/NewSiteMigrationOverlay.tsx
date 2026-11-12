import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useIvory } from "@/hooks/useIvory";
import {
  Rocket,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  PartyPopper,
  ExternalLink,
  Loader2,
} from "lucide-react";

const NEW_SITE_URL = "https://user.hanoienglish.vip/";
const SESSION_DISMISS_KEY = "hec-newsite-overlay-dismissed";

type Step = "intro" | "remember" | "create" | "done";

interface Props {
  userId: string;
  onCompleted: () => void;
}

function slugifyFirstName(name: string): string {
  const first = (name || "").trim().split(/\s+/)[0] || "student";
  return (
    first
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "student"
  );
}

export function NewSiteMigrationOverlay({ userId, onCompleted }: Props) {
  // May show on any area: the system's look only where the route is listed,
  // exactly the old look everywhere else.
  const ivory = useIvory();
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<"email" | "pw" | null>(null);

  // Decide whether to render
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Session dismiss
      try {
        if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return;
      } catch {}

      const { data, error } = await supabase
        .from("students")
        .select("full_name, migration_completed_at")
        .eq("linked_user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) return;
      if (data.migration_completed_at) return;

      setStudentName(data.full_name || "");
      setEmail(`${slugifyFirstName(data.full_name || "")}@english.com`);
      setEnabled(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!enabled) return null;

  const dismissForSession = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {}
    setEnabled(false);
  };

  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "student-create-migration-account",
        { body: { email } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setResult({ email: (data as any).email, password: (data as any).password });
      setStep("done");
      onCompleted();
    } catch (e: any) {
      toast.error(e?.message || "Could not create your new account");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text: string, which: "email" | "pw") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Couldn't copy. Please write it down.");
    }
  };

  return (
    <div className={ivory ? "fixed inset-0 z-[200] overflow-y-auto bg-hec-paper" : "fixed inset-0 z-[200] overflow-y-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"}>
      {/* Floating orbs (legacy only: blur and a looping pulse are outside the system) */}
      {!ivory && (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-yellow-300/30 blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-pink-300/30 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>
      )}

      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className={ivory ? "overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-3" : "rounded-3xl bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-2xl overflow-hidden"}>
            <div className={ivory ? "px-4 py-6 text-hec-ink sm:px-8 sm:py-8" : "px-6 sm:px-8 py-7 sm:py-9 text-white"}>
              {step === "intro" && (
                <div className="space-y-6 text-center animate-fade-in">
                  <div className={ivory ? "mx-auto inline-flex h-16 w-16 items-center justify-center rounded-hec-lg bg-hec-sunken text-hec-brass" : "inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-yellow-300 text-purple-700 shadow-xl mx-auto"}>
                    <Rocket className="h-10 w-10" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-2">
                    <div className={ivory ? "inline-flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-brass" : "inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-yellow-200"}>
                      <Sparkles className="h-3.5 w-3.5" /> New & Better Website!
                    </div>
                    <h2 className={ivory ? "font-display text-hec-display font-medium text-hec-ink" : "text-3xl sm:text-4xl font-extrabold leading-tight"}>
                      Hi {studentName.split(" ")[0] || "friend"}! 👋
                      <br />
                      Want to try our new site?
                    </h2>
                    <p className={ivory ? "text-hec-body text-hec-ink-soft" : "text-white/90 text-base"}>
                      It's faster, more fun, and built just for you. ✨
                    </p>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Button
                      onClick={() => setStep("remember")}
                      className={ivory ? "min-h-14 w-full bg-hec-brass-fill text-hec-body font-semibold text-hec-on-brass hover:bg-hec-brass-fill/90" : "w-full h-14 text-lg font-bold bg-yellow-300 text-purple-700 hover:bg-yellow-200 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl"}
                    >
                      Yes, take me there! 🚀
                    </Button>
                    <button
                      onClick={dismissForSession}
                      className={ivory ? "min-h-hec-target w-full rounded-hec-md text-hec-small font-medium text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "w-full text-sm text-white/70 hover:text-white py-2 font-medium"}
                    >
                      Not right now
                    </button>
                  </div>
                </div>
              )}

              {step === "remember" && (
                <div className="space-y-6 animate-fade-in">
                  <button
                    onClick={() => setStep("intro")}
                    className={ivory ? "inline-flex min-h-hec-target items-center gap-2 rounded-hec-md px-2 text-hec-small text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <div className="text-center space-y-3">
                    <div className={ivory ? "mx-auto inline-flex h-16 w-16 items-center justify-center rounded-hec-lg bg-hec-sunken" : "inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/20 mx-auto"}>
                      <KeyRound className={ivory ? "h-8 w-8 text-hec-brass" : "h-8 w-8 text-yellow-200"} />
                    </div>
                    <h2 className={ivory ? "font-display text-hec-h1 font-medium text-hec-ink" : "text-2xl sm:text-3xl font-extrabold leading-tight"}>
                      Do you remember your username and password?
                    </h2>
                    <p className={ivory ? "text-hec-small text-hec-ink-soft" : "text-white/85 text-sm"}>
                      You'll need them to log into the new site.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        window.open(NEW_SITE_URL, "_blank", "noopener,noreferrer");
                        dismissForSession();
                      }}
                      className={ivory ? "min-h-14 w-full text-hec-body" : "w-full h-14 text-base font-bold bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-xl rounded-2xl"}
                    >
                      <Check className="h-5 w-5 mr-2" /> Yes, I remember!
                    </Button>
                    <Button
                      onClick={() => setStep("create")}
                      variant="outline"
                      className={ivory ? "min-h-14 w-full whitespace-normal text-hec-body" : "w-full h-14 text-base font-bold bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white rounded-2xl"}
                    >
                      No, I forgot — make me a new one
                    </Button>
                  </div>
                </div>
              )}

              {step === "create" && (
                <div className="space-y-6 animate-fade-in">
                  <button
                    onClick={() => setStep("remember")}
                    className={ivory ? "inline-flex min-h-hec-target items-center gap-2 rounded-hec-md px-2 text-hec-small text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <div className="text-center space-y-2">
                    <div className={ivory ? "mx-auto inline-flex h-16 w-16 items-center justify-center rounded-hec-lg bg-hec-sunken text-hec-brass" : "inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-yellow-300 text-purple-700 mx-auto shadow-lg"}>
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h2 className={ivory ? "font-display text-hec-h1 font-medium text-hec-ink" : "text-2xl sm:text-3xl font-extrabold"}>
                      Let's make your new login!
                    </h2>
                    <p className={ivory ? "text-hec-small text-hec-ink-soft" : "text-white/85 text-sm"}>
                      Pick an easy email you'll remember. Your password will be{" "}
                      <span className={ivory ? "font-semibold tabular-nums text-hec-ink" : "font-bold text-yellow-200"}>1234567</span>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-email" className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-white/90 font-semibold"}>
                      Your new email
                    </Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      className={ivory ? undefined : "h-12 text-base bg-white text-foreground"}
                      placeholder="anna@english.com"
                      autoComplete="off"
                    />
                    <p className={ivory ? "text-hec-caption text-hec-ink-soft" : "text-xs text-white/70"}>
                      Tip: try <span className="font-mono">{slugifyFirstName(studentName)}@english.com</span>
                    </p>
                  </div>

                  <div className={ivory ? "rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink" : "rounded-2xl bg-white/10 border border-white/20 p-4 text-sm text-white/90"}>
                    <p className="font-semibold mb-1">📌 What happens next:</p>
                    <ul className={ivory ? "list-inside list-disc space-y-1 text-hec-ink-soft" : "list-disc list-inside space-y-1 text-white/80"}>
                      <li>We make a brand-new login just for you</li>
                      <li>Your old login still works too</li>
                      <li>You'll see your new password to write down</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleCreate}
                    disabled={submitting || !email}
                    className={ivory ? "min-h-14 w-full bg-hec-brass-fill text-hec-body font-semibold text-hec-on-brass hover:bg-hec-brass-fill/90" : "w-full h-14 text-lg font-bold bg-yellow-300 text-purple-700 hover:bg-yellow-200 shadow-xl rounded-2xl disabled:opacity-60"}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        Create my new login <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === "done" && result && (
                <div className="space-y-6 animate-fade-in text-center">
                  <div className={ivory ? "mx-auto inline-flex h-16 w-16 items-center justify-center rounded-hec-lg bg-hec-sunken text-hec-brass" : "inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-yellow-300 text-purple-700 mx-auto shadow-xl"}>
                    <PartyPopper className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className={ivory ? "font-display text-hec-h1 font-medium text-hec-ink" : "text-3xl font-extrabold"}>All done! 🎉</h2>
                    <p className={ivory ? "text-hec-body font-medium text-hec-ink" : "text-white/90 text-base font-semibold"}>
                      📝 Write this down somewhere safe — you'll need it to log in!
                    </p>
                  </div>

                  <div className={ivory ? "space-y-4 rounded-hec-md border border-hec-line bg-hec-raised p-4 text-left" : "rounded-2xl bg-white p-5 space-y-4 text-left shadow-2xl"}>
                    <div>
                      <div className={ivory ? "mb-1 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft" : "text-xs font-bold uppercase tracking-wider text-purple-700 mb-1"}>
                        Your new email
                      </div>
                      <div className="flex items-center gap-2">
                        <code className={ivory ? "min-w-0 flex-1 break-all rounded-hec-sm bg-hec-sunken px-3 py-2 text-hec-body font-semibold text-hec-ink" : "flex-1 text-base sm:text-lg font-bold text-foreground bg-yellow-100 rounded-lg px-3 py-2 break-all"}>
                          {result.email}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copy(result.email, "email")}
                          className="shrink-0"
                          aria-label="Copy email"
                        >
                          {copied === "email" ? (
                            <Check className={ivory ? "h-4 w-4 text-hec-leaf" : "h-4 w-4 text-emerald-600"} />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className={ivory ? "mb-1 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft" : "text-xs font-bold uppercase tracking-wider text-purple-700 mb-1"}>
                        Your new password
                      </div>
                      <div className="flex items-center gap-2">
                        <code className={ivory ? "min-w-0 flex-1 rounded-hec-sm bg-hec-sunken px-3 py-2 text-center text-hec-h1 font-semibold tracking-widest tabular-nums text-hec-ink" : "flex-1 text-2xl font-extrabold text-foreground bg-yellow-100 rounded-lg px-3 py-2 tracking-widest text-center"}>
                          {result.password}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copy(result.password, "pw")}
                          className="shrink-0"
                          aria-label="Copy password"
                        >
                          {copied === "pw" ? (
                            <Check className={ivory ? "h-4 w-4 text-hec-leaf" : "h-4 w-4 text-emerald-600"} />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        window.open(NEW_SITE_URL, "_blank", "noopener,noreferrer");
                        dismissForSession();
                      }}
                      className={ivory ? "min-h-14 w-full text-hec-body" : "w-full h-14 text-base font-bold bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-xl rounded-2xl"}
                    >
                      Open the new website <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                    <button
                      onClick={dismissForSession}
                      className={ivory ? "min-h-hec-target w-full rounded-hec-md text-hec-small font-medium text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "w-full text-sm text-white/80 hover:text-white py-2 font-medium"}
                    >
                      I wrote it down — close this
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
