/**
 * DemoAccessManager — admin control for the ONE permitted demo account.
 *
 * THIS APP HOLDS REAL STUDENT AND FAMILY DATA. The demo is a student-role
 * sandbox: own-row RLS plus enrolment restricted to the fictional "Demo
 * Class", so a visitor can never see a real record. There is no admin,
 * teacher or family demo — those were revoked, and the login page no longer
 * carries any credential.
 *
 * The password is chosen here by an admin and set straight onto the auth
 * user by the manage-demo-student function. It is never stored in the
 * database and never committed to source.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2, KeyRound, Copy, AlertTriangle } from "lucide-react";

const invokeDemo = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("manage-demo-student", { body });
  if (error) {
    let detail = error.message;
    try {
      const b = await (error as any).context?.json?.();
      if (b?.error) detail = b.error;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  if (data?.success === false) throw new Error(data.error || "request failed");
  return data;
};

export function DemoAccessManager() {
  const queryClient = useQueryClient();
  const [pw, setPw] = useState("");

  const { data: status, isLoading } = useQuery<any>({
    queryKey: ["demo-access-status"],
    queryFn: () => invokeDemo({ action: "status" }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["demo-access-status"] });

  const setPasswordMutation = useMutation({
    mutationFn: () => invokeDemo({ action: "set_password", password: pw }),
    onSuccess: () => {
      toast.success("Demo enabled — share the password only with people you choose");
      setPw("");
      refresh();
    },
    onError: (e: any) => toast.error("Couldn't set the demo password", { description: e.message }),
  });

  const disableMutation = useMutation({
    mutationFn: () => invokeDemo({ action: "disable" }),
    onSuccess: () => { toast.success("Demo access switched off"); refresh(); },
    onError: (e: any) => toast.error("Couldn't disable the demo", { description: e.message }),
  });

  const suggest = () => {
    // Readable but unguessable, generated client-side and shown once.
    const words = ["harbor", "lantern", "meadow", "copper", "willow", "quartz", "cobalt", "cedar"];
    const w = () => words[Math.floor(Math.random() * words.length)];
    setPw(`${w()}-${w()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-violet-500" />
              Demo access
            </CardTitle>
            <CardDescription>
              One student-only sandbox account, gated by a password you set.
            </CardDescription>
          </div>
          {!isLoading && (
            status?.enabled ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 gap-1">
                <ShieldCheck className="h-3 w-3" />Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <ShieldOff className="h-3 w-3" />Disabled
              </Badge>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This is a live system with real student and family records. Demo access is limited to a
            <strong> student</strong> account enrolled only in the fictional “Demo Class” — it cannot
            see real students, families or finances. Admin, teacher and family demo logins have been
            permanently removed.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />Loading…
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Demo sign-in email: <span className="font-mono font-semibold">{status?.demo_email}</span>
                <Button
                  variant="ghost" size="sm" className="h-6 px-1.5 ml-1"
                  onClick={() => {
                    navigator.clipboard.writeText(status?.demo_email || "");
                    toast.success("Email copied");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </p>
              <p>
                {status?.password_set_at
                  ? `Password last set ${new Date(status.password_set_at).toLocaleString()}.`
                  : "No password set yet — the demo account is locked."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-pw">
                {status?.enabled ? "Change the demo password" : "Set a demo password to enable it"}
              </Label>
              <div className="flex gap-2 flex-wrap">
                <Input
                  id="demo-pw"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="At least 10 characters"
                  className="flex-1 min-w-[200px] font-mono"
                  autoComplete="new-password"
                />
                <Button variant="outline" size="sm" onClick={suggest}>Suggest</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Visitors type this on the login page. It is set directly on the account and never
                stored in the database — if you forget it, just set a new one.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                disabled={pw.length < 10 || setPasswordMutation.isPending}
                onClick={() => setPasswordMutation.mutate()}
              >
                {setPasswordMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><ShieldCheck className="h-4 w-4" />{status?.enabled ? "Update password" : "Enable demo"}</>}
              </Button>
              {status?.enabled && (
                <Button
                  variant="outline" className="gap-2"
                  disabled={disableMutation.isPending}
                  onClick={() => disableMutation.mutate()}
                >
                  {disableMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ShieldOff className="h-4 w-4" />}
                  Switch off demo
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
