/**
 * Class Settings: the class's private Facebook group. Saved on its own, so
 * changing it does not set off the tuition and payroll recalculation the
 * main Save runs.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fbDb, normalizeFacebookGroupUrl, useClassFacebookGroup } from "@/lib/facebookGroup";

export function ClassFacebookGroupField({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const { data: saved, isLoading } = useClassFacebookGroup(classId);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(saved ?? ""), [saved]);

  const normalized = normalizeFacebookGroupUrl(value);
  const invalid = normalized === null;
  const unchanged = (normalized || null) === (saved ?? null);

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      const { error } = normalized
        ? await fbDb.from("class_facebook_groups").upsert(
            { class_id: classId, group_url: normalized, updated_at: new Date().toISOString() },
            { onConflict: "class_id" },
          )
        : await fbDb.from("class_facebook_groups").delete().eq("class_id", classId);
      if (error) throw error;
      setValue(normalized);
      qc.invalidateQueries({ queryKey: ["class-facebook-group", classId] });
      toast.success(normalized ? "Facebook group saved" : "Facebook group removed");
    } catch (e: any) {
      toast.error(e?.message || "Could not save the Facebook group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`fb-group-${classId}`}>Facebook group</Label>
      <div className="flex gap-2">
        <Input
          id={`fb-group-${classId}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://www.facebook.com/groups/…"
          disabled={isLoading}
          aria-invalid={invalid}
        />
        <Button type="button" variant="outline" onClick={save} disabled={saving || invalid || unchanged}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {invalid ? (
        <p className="text-xs text-destructive">Paste the group's link, e.g. https://www.facebook.com/groups/hecstars</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Shown as "Open our class group" next to Share to Facebook on approved homework videos. Only this class's
          families and teachers can see it.
          {saved && (
            <a href={saved} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 underline">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </p>
      )}
    </div>
  );
}
