import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
/** Ivory classes shared by the steps (DESIGN_SYSTEM s.15). */
const IV = {
  tile: "mx-auto inline-flex items-center justify-center rounded-hec-lg border border-hec-line bg-hec-sunken text-hec-brass",
  big: "w-full min-h-14 whitespace-normal text-hec-body font-semibold",
  quiet: cn("flex w-full min-h-hec-target items-center justify-center rounded-hec-md px-4 text-hec-body font-medium text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken hover:text-hec-ink", FOCUS),
  back: cn("-ml-2 inline-flex min-h-hec-target items-center gap-2 rounded-hec-md px-2 text-hec-small font-medium text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken hover:text-hec-ink", FOCUS),
  step: "space-y-6 animate-in fade-in duration-300",
};

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
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-hec-paper text-hec-ink">
      {/* Floating orbs */}
      

      <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-6">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-3">
            <div className="px-4 py-8 text-hec-ink sm:px-8">
              {step === "intro" && (
                <div className={cn(IV.step, "text-center")}>
                  <div className={cn(IV.tile, "h-20 w-20")}>
                    <Rocket className="h-10 w-10" strokeWidth={2} />
                  </div>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                      <Sparkles className="h-4 w-4 text-hec-brass" /> New & Better Website!
                    </div>
                    <h2 className="whitespace-normal break-words font-display text-hec-display font-medium text-hec-ink">
                      Hi {studentName.split(" ")[0] || "friend"}! 👋
                      <br />
                      Want to try our new site?
                    </h2>
                    <p className="text-hec-body text-hec-ink-soft">
                      It's faster, more fun, and built just for you. ✨
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Button
                      variant="brass"
                      onClick={() => setStep("remember")}
                      className={IV.big}
                    >
                      Yes, take me there! 🚀
                    </Button>
                    <button
                      onClick={dismissForSession}
                      className={IV.quiet}
                    >
                      Not right now
                    </button>
                  </div>
                </div>
              )}

              {step === "remember" && (
                <div className={IV.step}>
                  <button
                    onClick={() => setStep("intro")}
                    className={IV.back}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <div className="text-center space-y-3">
                    <div className={cn(IV.tile, "h-16 w-16")}>
                      <KeyRound className="h-8 w-8" />
                    </div>
                    <h2 className="whitespace-normal break-words font-display text-hec-h1 font-medium text-hec-ink">
                      Do you remember your username and password?
                    </h2>
                    <p className="text-hec-body text-hec-ink-soft">
                      You'll need them to log into the new site.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        window.open(NEW_SITE_URL, "_blank", "noopener,noreferrer");
                        dismissForSession();
                      }}
                      className={IV.big}
                    >
                      <Check className="h-5 w-5" /> Yes, I remember!
                    </Button>
                    <Button
                      onClick={() => setStep("create")}
                      variant="outline"
                      className={IV.big}
                    >
                      No, I forgot — make me a new one
                    </Button>
                  </div>
                </div>
              )}

              {step === "create" && (
                <div className={IV.step}>
                  <button
                    onClick={() => setStep("remember")}
                    className={IV.back}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <div className="text-center space-y-2">
                    <div className={cn(IV.tile, "h-16 w-16")}>
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h2 className="whitespace-normal break-words font-display text-hec-h1 font-medium text-hec-ink">
                      Let's make your new login!
                    </h2>
                    <p className="text-hec-body text-hec-ink-soft">
                      Pick an easy email you'll remember. Your password will be{" "}
                      <span className="font-semibold tabular-nums text-hec-ink">1234567</span>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-email" className="text-hec-small font-medium text-hec-ink">
                      Your new email
                    </Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      className="text-hec-body"
                      placeholder="anna@english.com"
                      autoComplete="off"
                    />
                    <p className="text-hec-caption text-hec-ink-soft">
                      Tip: try <span className="break-all font-mono text-hec-ink">{slugifyFirstName(studentName)}@english.com</span>
                    </p>
                  </div>

                  <div className="rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink">
                    <p className="mb-1 font-semibold">📌 What happens next:</p>
                    <ul className="list-inside list-disc space-y-1 text-hec-ink-soft">
                      <li>We make a brand-new login just for you</li>
                      <li>Your old login still works too</li>
                      <li>You'll see your new password to write down</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleCreate}
                    disabled={submitting || !email}
                    className={IV.big}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        Create my new login <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === "done" && result && (
                <div className={cn(IV.step, "text-center")}>
                  <div className={cn(IV.tile, "h-20 w-20")}>
                    <PartyPopper className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-hec-display font-medium text-hec-ink">All done! 🎉</h2>
                    <p className="text-hec-body font-medium text-hec-ink">
                      📝 Write this down somewhere safe — you'll need it to log in!
                    </p>
                  </div>

                  <div className="space-y-4 rounded-hec-md border border-hec-line bg-hec-raised p-4 text-left sm:p-6">
                    <div>
                      <div className="mb-1 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        Your new email
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-hec-sm bg-hec-sunken px-3 py-2 text-hec-body font-semibold text-hec-ink">
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
                            <Check className="h-4 w-4 text-hec-leaf" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                        Your new password
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 rounded-hec-sm bg-hec-sunken px-3 py-2 text-center text-hec-h1 font-semibold tracking-widest tabular-nums text-hec-ink">
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
                            <Check className="h-4 w-4 text-hec-leaf" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        window.open(NEW_SITE_URL, "_blank", "noopener,noreferrer");
                        dismissForSession();
                      }}
                      className={IV.big}
                    >
                      Open the new website <ExternalLink className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={dismissForSession}
                      className={IV.quiet}
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
