/**
 * Your profile: who the app thinks you are.
 *
 * With four people sharing one admin account there was nothing to show
 * here, and nothing worth showing. Now that each has their own login,
 * two questions need answering on screen, and this card answers both:
 * which of us is signed in right now, and what name will my changes be
 * recorded under.
 *
 * Those are the same name. `profiles.display_name` is what the header
 * shows and what the Activity screen uses to label an entry, which is
 * why the card says so plainly rather than leaving someone to discover
 * that their changes were filed under an email prefix.
 *
 * If nobody has set a name yet the card asks for one up front instead of
 * waiting to be found in a settings tab — an unnamed admin is exactly
 * the gap the audit trail was built to close.
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Mail, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIdentity, initialsOf } from "@/hooks/useIdentity";

export function AdminProfileCard() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const { data: identity, isLoading } = useIdentity();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  // Nobody has chosen a name, so the audit trail is currently filing this
  // person's changes under a guess. Open the field rather than hide it.
  const unnamed = identity?.source === "fallback";

  useEffect(() => {
    if (identity) setName(identity.name);
  }, [identity]);

  useEffect(() => {
    if (unnamed) setEditing(true);
  }, [unnamed]);

  const save = useMutation({
    mutationFn: async (displayName: string) => {
      if (!user) throw new Error("Not signed in.");
      const trimmed = displayName.trim();
      if (trimmed.length < 2) throw new Error("Please enter your name.");

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: trimmed }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return trimmed;
    },
    onSuccess: () => {
      toast.success("Saved. Your changes will be recorded under this name.");
      setEditing(false);
      // The header reads the same query, so it updates with the card.
      queryClient.invalidateQueries({ queryKey: ["identity"] });
      // The Activity screen labels entries from the same field.
      queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Loading size="sm" message="Loading your profile" />
        </CardContent>
      </Card>
    );
  }

  const displayName = identity?.name ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-5 w-5" aria-hidden />
          Your profile
        </CardTitle>
        <CardDescription>
          Who you are signed in as on this device, and the name your actions are
          recorded under.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ------------------------------------------------- who you are */}
        <div className="flex flex-wrap items-center gap-4 rounded-hec-md border border-hec-line bg-hec-sunken/60 p-4">
          <Avatar className="h-14 w-14 ring-2 ring-background">
            <AvatarImage src={identity?.avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-base font-semibold">
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 whitespace-normal break-words text-hec-h3 font-semibold text-hec-ink">{displayName}</p>
              {role && (
                <Badge variant="secondary" className="gap-1 capitalize">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {role}
                </Badge>
              )}
            </div>
            {identity?.email && (
              <p className="mt-1 flex items-center gap-2 truncate text-hec-small text-hec-ink-soft">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {identity.email}
              </p>
            )}
          </div>

          {!editing && (
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          )}
        </div>

        {/* --------------------------------------------- set your name */}
        {unnamed && !save.isSuccess && (
          <p className="rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-3 text-hec-small text-hec-ink">
            You have not set a name yet, so <strong>{displayName}</strong> is a guess
            from your email address. Set your real name — it is what the Activity
            record will show beside everything you change.
          </p>
        )}

        {editing && (
          <form
            className="space-y-3 rounded-hec-md border border-hec-line p-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(name);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-display-name">Your name</Label>
              <Input
                id="admin-display-name"
                value={name}
                autoFocus
                placeholder="e.g. Mai Nguyen"
                onChange={(e) => setName(e.target.value)}
                disabled={save.isPending}
              />
              <p className="text-hec-caption text-hec-ink-soft">
                Shown in the header, and beside every change you make in Activity.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={save.isPending || name.trim().length < 2}>
                {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
                Save
              </Button>
              {!unnamed && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={save.isPending}
                  onClick={() => {
                    setName(displayName);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}

        {/* ------------------------------------------------ the point of it */}
        <p className="flex items-start gap-2 text-hec-small text-hec-ink-soft">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Everything you change is recorded in the database under this account.
            See it under <strong>Admin → Activity</strong>, filtered to your name.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
