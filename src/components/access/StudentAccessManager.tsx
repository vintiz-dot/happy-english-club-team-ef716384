/**
 * StudentAccessManager — front-desk account recovery, admin side.
 *
 * The whole flow is three interactions: type a name, press Issue, print the
 * card. One button handles both "this child has never had an account" and
 * "they forgot everything", because from the desk those look identical and
 * the staff member should not have to know the difference.
 *
 * The admin never sees or chooses a password. They hand over a one-time code
 * and the family sets their own — so no staff member accumulates working
 * credentials for children's accounts.
 *
 * The plaintext code exists in this component's state and nowhere else. It is
 * shown once, cleared when you move on, and is not recoverable from the
 * server afterwards — only its hash was stored. Reissue instead.
 */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  KeyRound, Search, Loader2, Printer, Copy, ShieldAlert, UserPlus,
  RefreshCw, CheckCircle2, X,
} from "lucide-react";
import { AccessCardDocument } from "./AccessCardDocument";
import { nodeToPdfBlob, downloadBlob, safeFileName, A4_CONTENT_WIDTH_PX } from "@/lib/reportPdf";

interface Hit {
  id: string;
  full_name: string;
  classes: string[];
  has_account: boolean;
  login_email: string | null;
  has_synthetic_login: boolean;
}

interface Status {
  student: { id: string; full_name: string };
  has_account: boolean;
  login_email: string | null;
  suggested_email: string | null;
  siblings: string[];
  outstanding_code: { issued_at: string; expires_at: string } | null;
  blocked: boolean;
  blocked_reason: string | null;
}

interface Issued {
  student_name: string;
  login_email: string;
  code: string;
  expires_at: string;
  siblings: string[];
  created_account: boolean;
}

/** Read the real reason out of the response body — invoke() only ever
 *  surfaces a generic "non-2xx status code". */
async function reasonFor(error: any): Promise<string> {
  let detail = error?.message ?? "Something went wrong";
  try {
    const body = await error?.context?.json?.();
    if (body?.error) detail = body.error;
  } catch { /* keep the generic message */ }
  return detail;
}

export function StudentAccessManager({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Debounced search — the admin is typing a child's name at a desk with a
  // parent waiting, so it has to feel instant without hammering the function.
  useEffect(() => {
    if (query.trim().length < 2) { setHits([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("manage-student-access", {
          body: { action: "search", query: query.trim() },
        });
        if (error) throw new Error(await reasonFor(error));
        if (!cancelled) setHits(data?.students ?? []);
      } catch (e: any) {
        if (!cancelled) toast.error("Search failed", { description: e.message });
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const pick = async (hit: Hit) => {
    setSelected(hit);
    setIssued(null);
    setStatus(null);
    setOverrideEmail("");
    try {
      const { data, error } = await supabase.functions.invoke("manage-student-access", {
        body: { action: "status", student_id: hit.id },
      });
      if (error) throw new Error(await reasonFor(error));
      setStatus(data as Status);
    } catch (e: any) {
      toast.error("Could not load this student", { description: e.message });
    }
  };

  const issue = async () => {
    if (!selected) return;
    setIssuing(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-student-access", {
        body: {
          action: "issue",
          student_id: selected.id,
          ...(overrideEmail.trim() ? { login_email: overrideEmail.trim() } : {}),
        },
      });
      if (error) throw new Error(await reasonFor(error));
      if (data?.success === false) throw new Error(data.error);
      setIssued(data as Issued);
      toast.success(data.created_account ? "Account created and card ready" : "New access card ready");
    } catch (e: any) {
      toast.error("Could not issue a code", { description: e.message });
    } finally {
      setIssuing(false);
    }
  };

  /** Render the card off-screen and download it as a PDF to print. */
  const printCard = async () => {
    if (!issued || !selected) return;
    const host = document.createElement("div");
    host.style.width = `${A4_CONTENT_WIDTH_PX}px`;
    stageRef.current?.appendChild(host);
    const root = createRoot(host);
    try {
      flushSync(() => {
        root.render(
          <div style={{ width: A4_CONTENT_WIDTH_PX, padding: 24 }}>
            <AccessCardDocument
              studentName={issued.student_name}
              className={selected.classes[0] ?? null}
              siblings={issued.siblings}
              loginEmail={issued.login_email}
              code={issued.code}
              expiresAt={issued.expires_at}
              claimUrl={`${window.location.origin}/claim`}
            />
          </div>,
        );
      });
      await new Promise((r) => setTimeout(r, 120));
      await (document as any).fonts?.ready?.catch?.(() => {});
      const blob = await nodeToPdfBlob(host);
      downloadBlob(blob, `${safeFileName(issued.student_name)} - Access Card.pdf`);
    } catch (e: any) {
      toast.error("Could not build the card", { description: e.message });
    } finally {
      root.unmount();
      host.remove();
    }
  };

  const reset = () => {
    setSelected(null); setStatus(null); setIssued(null); setOverrideEmail(""); setQuery("");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
          Student access &amp; recovery
        </CardTitle>
        <CardDescription>
          For families who have forgotten their password <em>and</em> their email. Find the child,
          issue a one-time code, print the card. You never see or set their password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Step 1: find the child ─────────────────────────────────── */}
        {!selected && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint" aria-hidden />
              <Input
                autoFocus
                aria-label="Student's name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type the student's name…"
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-hec-ink-faint" aria-hidden />
              )}
            </div>

            {hits.length > 0 && (
              <div className="max-h-[320px] divide-y divide-hec-line overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1">
                {hits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => pick(h)}
                    className="flex min-h-hec-target w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{h.full_name}</p>
                      <p className="break-words text-hec-small text-hec-ink-soft">
                        {h.classes.length ? h.classes.join(", ") : "No class"}
                        {h.login_email ? ` · ${h.login_email}` : ""}
                      </p>
                    </div>
                    <Badge variant={h.has_account ? "outline" : "secondary"} className="shrink-0">
                      {h.has_account ? "has account" : "no account"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {query.trim().length >= 2 && !searching && hits.length === 0 && (
              <p className="py-4 text-center text-hec-small text-hec-ink-soft">
                No active student matches “{query}”.
              </p>
            )}
          </>
        )}

        {/* ── Step 2: confirm, then issue ────────────────────────────── */}
        {selected && !issued && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="whitespace-normal break-words hyphens-none text-balance text-hec-h3 font-semibold text-hec-ink">{selected.full_name}</p>
                <p className="break-words text-hec-small text-hec-ink-soft">
                  {selected.classes.length ? selected.classes.join(", ") : "No class"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={reset} title="Choose someone else" aria-label="Choose someone else">
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>

            {!status ? (
              <p className="flex items-center gap-2 py-4 text-hec-small text-hec-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />Checking this account…
              </p>
            ) : status.blocked ? (
              /* Staff accounts are refused by the server; say why plainly. */
              <div className="flex gap-2 rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-hec-danger" aria-hidden />
                <p className="text-hec-small text-hec-danger">{status.blocked_reason}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 rounded-hec-md border border-hec-line bg-hec-surface p-4 text-hec-small text-hec-ink">
                  <div className="flex items-start gap-2">
                    {status.has_account
                      ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                      : <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />}
                    <span className="font-semibold">
                      {status.has_account
                        ? "Has an account — this will issue a fresh code"
                        : "No account yet — this will create one and issue a code"}
                    </span>
                  </div>
                  {status.login_email && (
                    <p className="text-hec-caption text-hec-ink-soft">
                      Current login: <span className="break-all font-mono">{status.login_email}</span>
                    </p>
                  )}
                  {status.siblings.length > 0 && (
                    <p className="break-words text-hec-caption text-hec-ink-soft">
                      One login covers the whole family — also: {status.siblings.join(", ")}
                    </p>
                  )}
                  {status.outstanding_code && (
                    <p className="text-hec-caption text-hec-warn">
                      A card is already outstanding (expires{" "}
                      {new Date(status.outstanding_code.expires_at).toLocaleString()}). Issuing a new
                      one cancels it.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="override" className="text-hec-small font-medium text-hec-ink">
                    Login address{" "}
                    <span className="break-all font-normal text-hec-ink-soft">
                      — leave blank to use {status.suggested_email}
                    </span>
                  </Label>
                  <Input
                    id="override"
                    value={overrideEmail}
                    onChange={(e) => setOverrideEmail(e.target.value)}
                    placeholder={status.suggested_email ?? ""}
                    className="mt-2"
                  />
                  <p className="mt-2 text-hec-caption text-hec-ink-soft">
                    Enter the family's real email only if they have one and can read it — that also
                    turns on normal “forgot password” for them.
                  </p>
                </div>

                <Button
                  onClick={issue}
                  disabled={issuing}
                  className="w-full"
                >
                  {issuing
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Working…</>
                    : <><KeyRound className="h-4 w-4" aria-hidden />Issue access code</>}
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: the code, once ─────────────────────────────────── */}
        {issued && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
              <p className="flex items-start gap-2 text-hec-body font-semibold text-hec-ink">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-hec-leaf" aria-hidden />
                {issued.created_account ? "Account created" : "New code issued"} for {issued.student_name}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-hec-caption uppercase tracking-wider text-hec-ink-soft">Login</p>
                  <p className="break-all font-mono text-hec-small font-semibold text-hec-ink">{issued.login_email}</p>
                </div>
                <div>
                  <p className="text-hec-caption uppercase tracking-wider text-hec-ink-soft">One-time code</p>
                  <p className="font-mono text-hec-h1 font-semibold tracking-widest text-hec-ink">{issued.code}</p>
                </div>
              </div>

              <p className="text-hec-caption text-hec-warn">
                This code is shown once and cannot be retrieved later — print the card now, or copy
                it. Expires {new Date(issued.expires_at).toLocaleString()}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={printCard}>
                <Printer className="h-4 w-4" aria-hidden />Print card (PDF)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Login: ${issued.login_email}\nCode: ${issued.code}\n${window.location.origin}/claim`,
                  );
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />Copy
              </Button>
              <Button variant="ghost" onClick={reset}>
                Next student
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Off-screen render stage for the PDF (html2canvas cannot measure a
          display:none subtree, so it is parked outside the viewport). */}
      <div
        ref={stageRef}
        aria-hidden
        style={{ position: "fixed", left: -10000, top: 0, width: A4_CONTENT_WIDTH_PX, pointerEvents: "none" }}
      />
    </Card>
  );
}
