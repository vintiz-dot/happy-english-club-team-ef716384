/**
 * Managing the sign-in gate after it is set up.
 *
 * The gate itself handles first-time enrolment, because it has to — you
 * cannot reach this card without passing it. What it cannot do is the
 * ongoing part: adding a second device, removing the laptop you sold,
 * changing a passcode someone watched you type.
 *
 * Removing a device is the one genuinely dangerous control here, so it
 * refuses to remove your last way in.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Fingerprint, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import {
  enrolPasskey,
  forgetPasskey,
  getStatus,
  platformAuthenticatorAvailable,
  setPasscode,
  type UnlockStatus,
} from "@/lib/adminUnlock";
import { Loading } from "@/components/ui/loading";

export function AdminSecurityCard() {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);

  const { data: status, isLoading } = useQuery<UnlockStatus>({
    queryKey: ["admin-unlock-status"],
    queryFn: getStatus,
  });

  const { data: canUseBiometrics } = useQuery({
    queryKey: ["platform-authenticator"],
    queryFn: platformAuthenticatorAvailable,
    staleTime: Infinity,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-unlock-status"] });

  const addDevice = useMutation({
    mutationFn: () => enrolPasskey(),
    onSuccess: () => {
      toast.success("This device can now unlock the admin area.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDevice = useMutation({
    mutationFn: (id: string) => forgetPasskey(id),
    onSuccess: () => {
      toast.success("Device removed.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePasscode = useMutation({
    mutationFn: () => setPasscode(next, status?.hasPasscode ? current : undefined),
    onSuccess: () => {
      toast.success(status?.hasPasscode ? "Passcode changed." : "Passcode set.");
      setCurrent("");
      setNext("");
      setShowPasscodeForm(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passkeys = status?.passkeys ?? [];
  // Never let someone strand themselves: the last device can only go if a
  // passcode exists to take its place.
  const canRemoveDevice = passkeys.length > 1 || !!status?.hasPasscode;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          Sign-in gate
        </CardTitle>
        <CardDescription>
          The admin area asks you to confirm it's you once per browser session. This is
          what it accepts.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <Loading size="sm" />
        ) : (
          <>
            {/* ------------------------------------------------- devices */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Devices</h3>
                {canUseBiometrics && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={addDevice.isPending}
                    onClick={() => addDevice.mutate()}
                  >
                    {addDevice.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Add this device
                  </Button>
                )}
              </div>

              {passkeys.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {canUseBiometrics
                    ? "No devices yet. Adding this one means Face ID, Touch ID or Windows Hello instead of typing a passcode."
                    : "This browser cannot do biometrics, so the passcode below is how you get in here."}
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {passkeys.map((key) => (
                    <li key={key.id} className="flex items-center gap-3 p-3">
                      <Fingerprint className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {key.device_label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Added {dayjs(key.created_at).format("D MMM YYYY")}
                          {key.last_used_at
                            ? ` · last used ${dayjs(key.last_used_at).format("D MMM, HH:mm")}`
                            : " · not used yet"}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={!canRemoveDevice || removeDevice.isPending}
                        title={
                          canRemoveDevice
                            ? "Remove this device"
                            : "Set a passcode first, or you will lock yourself out"
                        }
                        onClick={() => removeDevice.mutate(key.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Remove {key.device_label}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {/* When enrolment fails, this is what makes the failure
                  reportable: the three facts that decide whether a passkey
                  can work on this machine at all. */}
              <details className="rounded-lg border bg-muted/30 text-sm">
                <summary className="cursor-pointer select-none p-3 text-xs font-medium text-muted-foreground">
                  Why is this device not working?
                </summary>
                <dl className="space-y-1.5 border-t p-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Built-in biometrics</dt>
                    <dd className="font-medium">
                      {canUseBiometrics === undefined
                        ? "checking…"
                        : canUseBiometrics
                          ? "available"
                          : "not available on this browser"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Passkeys bound to</dt>
                    <dd className="font-mono font-medium">{status?.rpId ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Secure connection</dt>
                    <dd className="font-medium">
                      {typeof window !== "undefined" && window.isSecureContext ? "yes" : "no — passkeys need HTTPS"}
                    </dd>
                  </div>
                </dl>
                <p className="border-t p-3 text-xs text-muted-foreground">
                  A passkey only works on the address it was created for. If you
                  reach this app on more than one address, add this device once
                  on each — or use the passcode, which works everywhere.
                  {!canUseBiometrics && (
                    <>
                      {" "}
                      On Windows, Hello must be set up under Settings → Accounts →
                      Sign-in options before a passkey can be created.
                    </>
                  )}
                </p>
              </details>
            </section>

            {/* ------------------------------------------------ passcode */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Passcode</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowPasscodeForm((v) => !v)}
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden />
                  {status?.hasPasscode ? "Change" : "Set one"}
                </Button>
              </div>

              {status?.hasPasscode ? (
                <p className="text-sm text-muted-foreground">
                  Set. Used when biometrics are unavailable or fail.
                </p>
              ) : passkeys.length > 0 ? (
                <p className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  <span>
                    <strong>Set a passcode.</strong> Your only way in is the device
                    above. If Windows Hello stops working, or that machine is
                    replaced, getting back in means deleting the passkey from the
                    database by hand.
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not set. Without one, a device that cannot do biometrics has no way in.
                </p>
              )}

              {showPasscodeForm && (
                <form
                  className="space-y-2 rounded-lg border p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    changePasscode.mutate();
                  }}
                >
                  {status?.hasPasscode && (
                    <div className="space-y-1.5">
                      <Label htmlFor="sec-current">Current passcode</Label>
                      <Input
                        id="sec-current"
                        type="password"
                        autoComplete="current-password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-next">New passcode</Label>
                    <Input
                      id="sec-next"
                      type="password"
                      autoComplete="new-password"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      changePasscode.isPending ||
                      next.length < 6 ||
                      (!!status?.hasPasscode && !current)
                    }
                  >
                    {changePasscode.isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                    )}
                    Save
                  </Button>
                </form>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
