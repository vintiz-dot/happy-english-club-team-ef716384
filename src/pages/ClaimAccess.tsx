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
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-background to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg mb-2">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <CardTitle>Set up your account</CardTitle>
          <CardDescription>
            Enter the one-time code from the card the school gave you, then choose your own
            password.
            <span className="block mt-1 text-xs">
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
                className="mt-1 font-mono tracking-widest text-center text-lg"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div>
              <Label htmlFor="password">Choose a password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                className="mt-1"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/30 rounded-lg p-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || !code.trim() || !password || !confirm}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" />Setting up…</>
                : <>Set my password</>}
            </Button>

            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
              Only you will know this password — the school cannot see it. The code works once.
            </p>

            <p className="text-xs text-center text-muted-foreground">
              Already set up? <Link to="/auth" className="underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
