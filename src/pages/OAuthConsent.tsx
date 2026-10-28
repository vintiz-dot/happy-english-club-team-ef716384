import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!authorizationId) return setError("This connection link is missing its request ID.");
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const next = window.location.pathname + window.location.search;
          window.location.href = "/auth?next=" + encodeURIComponent(next);
          return;
        }
        setEmail(sess.session.user.email ?? null);
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Something went wrong.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("No redirect was returned.");
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(`${approve ? "Approving" : "Cancelling"} failed: ${e?.message ?? "unknown error"}`);
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An app";
  const redirect = details?.redirect_uri ?? details?.client?.redirect_uri;
  const scopes: string[] = String(details?.scope ?? "").split(" ").filter(Boolean);
  const scopeLabel = (s: string) =>
    s === "openid" ? "Confirm who you are" : s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : `Additional permission requested: ${s}`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{details ? `Connect ${clientName} to Happy English Club` : "Connection request"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {error ? (
            <p className="text-destructive">Could not complete this request: {error}</p>
          ) : !details ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <>
              {email && <p>Signed in as <strong>{email}</strong></p>}
              <p>{clientName} will be able to use this app's read-only tools as you, while you stay signed in.</p>
              {redirect && <p className="text-muted-foreground break-all">Returns to: {redirect}</p>}
              {scopes.length > 0 && (
                <ul className="list-disc pl-5">{scopes.map((s) => <li key={s}>{scopeLabel(s)}</li>)}</ul>
              )}
              <p className="text-muted-foreground">This does not bypass this app's permissions — it only sees what your account can already see.</p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
                <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
