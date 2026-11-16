/**
 * ClaimAccess (/claim) — the family redeems the code on their printed card
 * and chooses their own password.
 *
 * Public by necessity: whoever lands here is locked out, so there is no
 * session to check. All the hardening lives server-side in
 * redeem-access-code (hashed single-use expiring codes, per-code attempt
 * lock, IP rate limiting, uniform errors, staff accounts refused).
 *
 * This page deliberately reveals NOTHING before a valid code is presented —
 * no student name, no email, no hint about whether a code exists. On
 * success it signs the family straight in, because asking a locked-out
 * parent to now go and log in manually is where they would give up.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

const MIN_PASSWORD = 8;

export default function ClaimAccess() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Please choose a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("redeem-access-code", {
        body: { code, new_password: password },
      });

      // invoke() reports a generic "non-2xx"; the real (deliberately uniform)
      // message is in the body.
      if (fnErr) {
        let detail = "That code is not valid. It may have been used already or expired — ask the school for a new one.";
        try {
          const b = await (fnErr as any).context?.json?.();
          if (b?.error) detail = b.error;
        } catch { /* keep the uniform message */ }
        throw new Error(detail);
      }
      if (data?.success === false) throw new Error(data.error);

      // Sign them straight in — a locked-out parent should not have to
      // remember what to do next.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signInErr) {
        toast.success("Password set — please sign in with your new password.");
        navigate("/auth");
        return;
      }

      toast.success("You're all set!");
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-hec-paper text-hec-ink">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-hec-lg border border-hec-line bg-hec-sunken flex items-center justify-center mb-2">
            <KeyRound className="h-7 w-7 text-hec-brass" />
          </div>
          <CardTitle>Set up your account</CardTitle>
          <CardDescription>
            Enter the one-time code from the card the school gave you, then choose your own
            password.
            <span className="block mt-2 text-hec-caption">
              Nhập mã một lần trên thẻ nhà trường đã cấp, rồi tự đặt mật khẩu.
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="code">One-time code</Label>
              <Input
                id="code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                className="mt-2 font-mono tracking-widest text-center text-hec-h3"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div>
              <Label htmlFor="password">Choose a password</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  autoComplete="new-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm">Type it again</Label>
              <Input
                id="confirm"
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-3 text-hec-small text-hec-danger">
                <AlertCircle className="h-4 w-4 shrink-0 mt-1" />
                <span className="min-w-0">{error}</span>
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || !code.trim() || !password || !confirm}
              className="w-full gap-2"
            >
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" />Setting up…</>
                : <>Set my password</>}
            </Button>

            <p className="text-hec-caption text-hec-ink-soft flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Only you will know this password — the school cannot see it. The code works once.
            </p>

            <p className="text-hec-small text-center text-hec-ink-soft">
              Already set up? <Link to="/auth" className="inline-flex min-h-hec-target items-center rounded-hec-sm px-1 font-medium text-hec-brass underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
