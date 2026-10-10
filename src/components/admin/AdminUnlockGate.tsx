/**
 * The admin sign-in gate.
 *
 * Stands between a signed-in admin and the admin area, once per browser
 * session. It exists for one scenario: the front-desk laptop left open and
 * logged in. Signing in proved who you were this morning; the gate asks
 * whether you are still the one sitting there.
 *
 * Three deliberate choices:
 *
 *  - Nothing enrolled means no gate. The first admin to arrive after this
 *    ships must not be locked out of the console they need in order to
 *    enrol. They get a prompt to set it up instead.
 *  - A failure to reach the server leaves the gate open, with the reason
 *    shown. A lock screen that cannot be dismissed because an edge
 *    function is down is worse than the risk it mitigates, and the
 *    destructive operations are guarded server-side regardless.
 *  - The passcode is always offered as a way through, not only when
 *    biometrics are missing. Fingerprint readers fail on cold hands.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Fingerprint, KeyRound, Loader2, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  getStatus,
  platformAuthenticatorAvailable,
  setPasscode,
  unlockWithPasscode,
  unlockWithPasskey,
  type UnlockStatus,
} from "@/lib/adminUnlock";
import { cn } from "@/lib/utils";

type Phase = "checking" | "locked" | "open" | "enrol";

export function AdminUnlockGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const [status, setStatus] = useState<UnlockStatus | null>(null);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passcode, setPasscodeValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<"passkey" | "passcode">("passkey");

  const refresh = useCallback(async () => {
    try {
      const next = await getStatus();
      setStatus(next);
      setCanUseBiometrics(await platformAuthenticatorAvailable());
      if (next.unlocked) setPhase("open");
      else if (!next.enrolled) setPhase("enrol");
      else {
        setPhase("locked");
        setMode(next.passkeys.length > 0 ? "passkey" : "passcode");
      }
    } catch (e) {
      // Fail open, loudly. See the note at the top of the file.
      setError((e as Error).message);
      setPhase("open");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPasscodeValue("");
      setConfirm("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!user || phase === "open") {
    return (
      <>
        {error && phase === "open" && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span>
              The sign-in gate could not be checked, so it has been left open.{" "}
              <span className="text-muted-foreground">{error}</span>
            </span>
          </div>
        )}
        {children}
      </>
    );
  }

  if (phase === "checking") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Checking the sign-in gate</span>
      </div>
    );
  }

  const enrolling = phase === "enrol";

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
        <div className="mb-5 flex flex-col items-center text-center">
          <span
            className={cn(
              "mb-3 grid h-12 w-12 place-items-center rounded-2xl",
              enrolling ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
            )}
          >
            {enrolling ? <ShieldCheck className="h-6 w-6" aria-hidden /> : <Lock className="h-6 w-6" aria-hidden />}
          </span>
          <h1 className="text-lg font-bold">
            {enrolling ? "Secure this account" : "Confirm it's you"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enrolling
              ? "Set this up once. After that the admin area asks for it a single time per browser session."
              : "Signed in as " + (user.email ?? "this account") + "."}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {/* ----------------------------------------------------- unlocking */}
        {!enrolling && mode === "passkey" && (
          <div className="space-y-3">
            <Button
              className="h-12 w-full gap-2"
              disabled={busy}
              onClick={() => attempt(unlockWithPasskey)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Fingerprint className="h-5 w-5" aria-hidden />}
              Use Face ID, Touch ID or Hello
            </Button>
            {status?.hasPasscode ? (
              <Button variant="ghost" className="w-full" onClick={() => { setMode("passcode"); setError(null); }}>
                Enter passcode instead
              </Button>
            ) : (
              // No fallback exists, so if the device is broken this screen is
              // a dead end. Say what the way out is rather than leaving them
              // pressing a button that will not work.
              <p className="text-center text-xs text-muted-foreground">
                No passcode is set on this account. If this device will not
                verify, the passkey has to be cleared from the database before
                you can get back in.
              </p>
            )}
          </div>
        )}

        {!enrolling && mode === "passcode" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void attempt(() => unlockWithPasscode(passcode));
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="unlock-passcode">Passcode</Label>
              <Input
                id="unlock-passcode"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={passcode}
                onChange={(e) => setPasscodeValue(e.target.value)}
                disabled={busy || !!status?.passcodeLockedUntil}
              />
            </div>
            {status?.passcodeLockedUntil && (
              <p className="text-xs text-muted-foreground">
                Locked after too many attempts. Try again later, or use your device instead.
              </p>
            )}
            <Button type="submit" className="h-11 w-full gap-2" disabled={busy || !passcode}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
              Unlock
            </Button>
            {(status?.passkeys.length ?? 0) > 0 && (
              <Button variant="ghost" className="w-full" onClick={() => { setMode("passkey"); setError(null); }}>
                Use this device instead
              </Button>
            )}
          </form>
        )}

        {/* ------------------------------------------------------ enrolling */}
        {enrolling && (
          <div className="space-y-4">
            {canUseBiometrics && (
              <div className="space-y-2">
                <Button
                  className="h-12 w-full gap-2"
                  disabled={busy}
                  onClick={() =>
                    attempt(async () => {
                      const { enrolPasskey } = await import("@/lib/adminUnlock");
                      await enrolPasskey();
                    })
                  }
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Fingerprint className="h-5 w-5" aria-hidden />}
                  Use this device
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Face ID, Touch ID or Windows Hello. Nothing leaves the device.
                </p>
              </div>
            )}

            <div className="relative py-1 text-center">
              <span className="relative z-10 bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
                {canUseBiometrics ? "or set a passcode" : "set a passcode"}
              </span>
              <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" aria-hidden />
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (passcode !== confirm) {
                  setError("Those do not match.");
                  return;
                }
                void attempt(() => setPasscode(passcode));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="new-passcode">New passcode</Label>
                <Input
                  id="new-passcode"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={passcode}
                  onChange={(e) => setPasscodeValue(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  At least six characters, and not 123456.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-passcode">Again</Label>
                <Input
                  id="confirm-passcode"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                />
              </div>
              <Button
                type="submit"
                variant={canUseBiometrics ? "outline" : "default"}
                className="h-11 w-full"
                disabled={busy || passcode.length < 6 || !confirm}
              >
                Save passcode
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
