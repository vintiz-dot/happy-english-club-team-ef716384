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
          <KeyRound className="h-5 w-5 text-violet-500" />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type the student's name…"
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {hits.length > 0 && (
              <div className="rounded-xl border divide-y max-h-[320px] overflow-y-auto">
                {hits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => pick(h)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{h.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {h.classes.length ? h.classes.join(", ") : "No class"}
                        {h.login_email ? ` · ${h.login_email}` : ""}
                      </p>
                    </div>
                    <Badge variant={h.has_account ? "outline" : "secondary"} className="shrink-0 font-normal text-[10px]">
                      {h.has_account ? "has account" : "no account"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {query.trim().length >= 2 && !searching && hits.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
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
                <p className="text-base font-black leading-tight">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.classes.length ? selected.classes.join(", ") : "No class"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={reset} title="Choose someone else">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!status ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />Checking this account…
              </p>
            ) : status.blocked ? (
              /* Staff accounts are refused by the server; say why plainly. */
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 flex gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{status.blocked_reason}</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {status.has_account
                      ? <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
                      : <UserPlus className="h-4 w-4 text-emerald-500 shrink-0" />}
                    <span className="font-semibold">
                      {status.has_account
                        ? "Has an account — this will issue a fresh code"
                        : "No account yet — this will create one and issue a code"}
                    </span>
                  </div>
                  {status.login_email && (
                    <p className="text-xs text-muted-foreground">
                      Current login: <span className="font-mono">{status.login_email}</span>
                    </p>
                  )}
                  {status.siblings.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      One login covers the whole family — also: {status.siblings.join(", ")}
                    </p>
                  )}
                  {status.outstanding_code && (
                    <p className="text-xs text-amber-600">
                      A card is already outstanding (expires{" "}
                      {new Date(status.outstanding_code.expires_at).toLocaleString()}). Issuing a new
                      one cancels it.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="override" className="text-xs">
                    Login address{" "}
                    <span className="font-normal text-muted-foreground">
                      — leave blank to use {status.suggested_email}
                    </span>
                  </Label>
                  <Input
                    id="override"
                    value={overrideEmail}
                    onChange={(e) => setOverrideEmail(e.target.value)}
                    placeholder={status.suggested_email ?? ""}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Enter the family's real email only if they have one and can read it — that also
                    turns on normal “forgot password” for them.
                  </p>
                </div>

                <Button
                  onClick={issue}
                  disabled={issuing}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white w-full"
                >
                  {issuing
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Working…</>
                    : <><KeyRound className="h-4 w-4" />Issue access code</>}
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: the code, once ─────────────────────────────────── */}
        {issued && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-violet-500/50 bg-violet-500/5 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {issued.created_account ? "Account created" : "New code issued"} for {issued.student_name}
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Login</p>
                  <p className="text-sm font-mono font-bold break-all">{issued.login_email}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">One-time code</p>
                  <p className="text-2xl font-black font-mono tracking-widest">{issued.code}</p>
                </div>
              </div>

              <p className="text-[11px] text-amber-600">
                This code is shown once and cannot be retrieved later — print the card now, or copy
                it. Expires {new Date(issued.expires_at).toLocaleString()}.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={printCard} className="gap-2">
                <Printer className="h-4 w-4" />Print card (PDF)
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Login: ${issued.login_email}\nCode: ${issued.code}\n${window.location.origin}/claim`,
                  );
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />Copy
              </Button>
              <Button variant="ghost" onClick={reset} className="gap-2">
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
