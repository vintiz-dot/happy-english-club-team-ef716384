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
                <h3 className="text-hec-h3 font-semibold text-hec-ink">Devices</h3>
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
                <p className="rounded-hec-md border border-dashed border-hec-line p-3 text-hec-small text-hec-ink-soft">
                  {canUseBiometrics
                    ? "No devices yet. Adding this one means Face ID, Touch ID or Windows Hello instead of typing a passcode."
                    : "This browser cannot do biometrics, so the passcode below is how you get in here."}
                </p>
              ) : (
                <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
                  {passkeys.map((key) => (
                    <li key={key.id} className="flex items-center gap-3 p-3">
                      <Fingerprint className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-normal break-words text-hec-small font-medium text-hec-ink">
                          {key.device_label}
                        </span>
                        <span className="block text-hec-caption tabular-nums text-hec-ink-soft">
                          Added {dayjs(key.created_at).format("D MMM YYYY")}
                          {key.last_used_at
                            ? ` · last used ${dayjs(key.last_used_at).format("D MMM, HH:mm")}`
                            : " · not used yet"}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="destructive-quiet"
                        className="shrink-0"
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
              <details className="rounded-hec-md border border-hec-line bg-hec-sunken/60 text-hec-small">
                <summary className="flex min-h-hec-target cursor-pointer select-none items-center rounded-hec-md px-3 text-hec-caption font-medium text-hec-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                  Why is this device not working?
                </summary>
                <dl className="space-y-2 border-t border-hec-line p-3 text-hec-caption">
                  <div className="flex justify-between gap-3">
                    <dt className="text-hec-ink-soft">Built-in biometrics</dt>
                    <dd className="text-right font-medium text-hec-ink">
                      {canUseBiometrics === undefined
                        ? "checking…"
                        : canUseBiometrics
                          ? "available"
                          : "not available on this browser"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-hec-ink-soft">Passkeys bound to</dt>
                    <dd className="break-all text-right font-mono font-medium text-hec-ink">{status?.rpId ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-hec-ink-soft">Secure connection</dt>
                    <dd className="text-right font-medium text-hec-ink">
                      {typeof window !== "undefined" && window.isSecureContext ? "yes" : "no — passkeys need HTTPS"}
                    </dd>
                  </div>
                </dl>
                <p className="border-t border-hec-line p-3 text-hec-caption text-hec-ink-soft">
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
                <h3 className="text-hec-h3 font-semibold text-hec-ink">Passcode</h3>
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
                <p className="text-hec-small text-hec-ink-soft">
                  Set. Used when biometrics are unavailable or fail.
                </p>
              ) : passkeys.length > 0 ? (
                <p className="flex items-start gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-3 text-hec-small text-hec-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-hec-warn" aria-hidden />
                  <span>
                    <strong>Set a passcode.</strong> Your only way in is the device
                    above. If Windows Hello stops working, or that machine is
                    replaced, getting back in means deleting the passkey from the
                    database by hand.
                  </span>
                </p>
              ) : (
                <p className="text-hec-small text-hec-ink-soft">
                  Not set. Without one, a device that cannot do biometrics has no way in.
                </p>
              )}

              {showPasscodeForm && (
                <form
                  className="space-y-2 rounded-hec-md border border-hec-line p-3"
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
