import { useState } from "react";
import { useAdminAnnouncements, type Announcement } from "@/hooks/useAnnouncements";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Plus, Trash2, Pencil, Eye, EyeOff, Upload, Calendar, Users, Monitor,
} from "lucide-react";
import { format } from "date-fns";
import { PlaceholderCard } from "@/components/ui/loading";

const DISPLAY_TYPES = [
  { value: "banner", label: "Banner" },
  { value: "popup", label: "Popup" },
  { value: "sticky_header", label: "Sticky Header" },
  { value: "footer_bar", label: "Footer Bar" },
  { value: "splash", label: "Full-Screen Splash" },
  { value: "toast", label: "Toast" },
];

const AUDIENCES = [
  { value: "everyone", label: "Everyone" },
  { value: "authenticated", label: "All Logged-in Users" },
  { value: "students", label: "Students Only" },
  { value: "teachers", label: "Teachers Only" },
  { value: "families", label: "Families Only" },
  { value: "paying_students", label: "Paying Students" },
];

const PLACEMENTS = [
  { value: "both", label: "Both (Before & After Login)" },
  { value: "before_login", label: "Before Login Only" },
  { value: "after_login", label: "After Login Only" },
];

interface FormState {
  title: string;
  body: string;
  image_url: string;
  display_type: string;
  priority: number;
  target_audience: string;
  placement: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  is_dismissible: boolean;
  style_bg: string;
  style_text: string;
  style_animation: string;
  class_scope: "all" | "specific";
  target_class_ids: string[];
  student_scope: "all" | "specific";
  target_student_ids: string[];
}

const defaultForm: FormState = {
  title: "",
  body: "",
  image_url: "",
  display_type: "banner",
  priority: 0,
  target_audience: "everyone",
  placement: "both",
  starts_at: "",
  expires_at: "",
  is_active: true,
  is_dismissible: true,
  style_bg: "",
  style_text: "",
  style_animation: "",
  class_scope: "all",
  target_class_ids: [],
  student_scope: "all",
  target_student_ids: [],
};

export const AnnouncementManager = () => {
  const { announcements, isLoading, create, update, remove, toggle, isCreating, isUpdating } = useAdminAnnouncements();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [uploading, setUploading] = useState(false);

  // Fetch classes and students for targeting
  const { data: allClasses = [] } = useQuery({
    queryKey: ["admin-all-classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["admin-all-students-for-announcements", form.target_class_ids],
    queryFn: async () => {
      let query = supabase.from("students").select("id, full_name, enrollments(class_id)").eq("is_active", true).order("full_name");
      const { data } = await query;
      if (!data) return [];
      // If specific classes selected, filter students enrolled in those classes
      if (form.class_scope === "specific" && form.target_class_ids.length > 0) {
        return data.filter((s: any) =>
          (s.enrollments ?? []).some((e: any) => form.target_class_ids.includes(e.class_id))
        );
      }
      return data;
    },
    enabled: form.target_audience === "students" || form.target_audience === "paying_students",
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    const classIds = a.target_class_ids ?? [];
    const studentIds = a.target_student_ids ?? [];
    setForm({
      title: a.title,
      body: a.body,
      image_url: a.image_url || "",
      display_type: a.display_type,
      priority: a.priority,
      target_audience: a.target_audience,
      placement: a.placement,
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : "",
      is_active: a.is_active,
      is_dismissible: a.is_dismissible,
      style_bg: a.style_config?.bg || "",
      style_text: a.style_config?.text || "",
      style_animation: a.style_config?.animation || "",
      class_scope: classIds.length > 0 ? "specific" : "all",
      target_class_ids: classIds,
      student_scope: studentIds.length > 0 ? "specific" : "all",
      target_student_ids: studentIds,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("announcements").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("announcements").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const styleConfig: Record<string, string> = {};
    if (form.style_bg) styleConfig.bg = form.style_bg;
    if (form.style_text) styleConfig.text = form.style_text;
    if (form.style_animation) styleConfig.animation = form.style_animation;

    const payload: any = {
      title: form.title,
      body: form.body,
      image_url: form.image_url || null,
      display_type: form.display_type,
      priority: form.priority,
      target_audience: form.target_audience,
      placement: form.placement,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
      is_dismissible: form.is_dismissible,
      style_config: styleConfig,
      target_class_ids: (form.target_audience === "students" || form.target_audience === "paying_students") && form.class_scope === "specific" ? form.target_class_ids : [],
      target_student_ids: (form.target_audience === "students" || form.target_audience === "paying_students") && form.student_scope === "specific" ? form.target_student_ids : [],
    };

    try {
      if (editingId) {
        await update({ id: editingId, ...payload });
        toast({ title: "Announcement updated" });
      } else {
        await create({ ...payload, created_by: user!.id });
        toast({ title: "Announcement created" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast({ title: "Announcement deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (a: Announcement) => {
    const now = new Date();
    if (!a.is_active) return <Badge variant="secondary">Disabled</Badge>;
    if (a.expires_at && new Date(a.expires_at) < now) return <Badge variant="outline">Expired</Badge>;
    if (a.starts_at && new Date(a.starts_at) > now) return <Badge variant="warning">Scheduled</Badge>;
    return <Badge variant="success">Live</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken">
            <Megaphone className="h-5 w-5 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-hec-h1 font-medium text-hec-ink">Announcements</h2>
            <p className="text-hec-small text-hec-ink-soft">Manage site-wide notifications</p>
          </div>
        </div>
        <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <PlaceholderCard rows={3} />
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-hec-body text-hec-ink-soft">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-hec-ink-faint" />
            <p>No announcements yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {announcements.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-6">
                    <div className="min-w-0 flex-1">
                      {/* The title can name a child or a class: it wraps, never cut. */}
                      <p className="mb-2 whitespace-normal break-words text-hec-body font-medium text-hec-ink">{a.title}</p>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        {getStatusBadge(a)}
                        <Badge variant="outline" className="capitalize">{a.display_type.replace("_", " ")}</Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {a.target_audience.replace("_", " ")}
                        </Badge>
                      </div>
                      {a.starts_at || a.expires_at ? (
                        <p className="flex flex-wrap items-center gap-1 text-hec-caption tabular-nums text-hec-ink-soft">
                          <Calendar className="h-3 w-3" />
                          {a.starts_at ? format(new Date(a.starts_at), "MMM d, yyyy HH:mm") : "Now"}
                          {" → "}
                          {a.expires_at ? format(new Date(a.expires_at), "MMM d, yyyy HH:mm") : "Forever"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggle({ id: a.id, is_active: !a.is_active })}
                        title={a.is_active ? "Disable" : "Enable"}
                        aria-label={a.is_active ? "Disable" : "Enable"}
                      >
                        {a.is_active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5 text-hec-ink-soft" />}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit announcement" onClick={() => openEdit(a)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete announcement"
                        className="text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input id="ann-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-body">Body (HTML supported)</Label>
              <Textarea id="ann-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Announcement content…" rows={4} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-image">Image</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input id="ann-image" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL (or upload)" className="min-w-0 flex-1" />
                <label className="shrink-0">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  <Button variant="outline" asChild disabled={uploading}>
                    <span><Upload className="h-4 w-4" />{uploading ? "…" : "Upload"}</span>
                  </Button>
                </label>
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="mt-2 h-20 rounded-hec-md object-cover" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ann-type">Display Type</Label>
                <Select value={form.display_type} onValueChange={(v) => setForm({ ...form, display_type: v })}>
                  <SelectTrigger id="ann-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-priority">Priority</Label>
                <Input id="ann-priority" type="number" className="tabular-nums" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ann-audience">Target Audience</Label>
                <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger id="ann-audience"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-placement">Placement</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                  <SelectTrigger id="ann-placement"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Class & Student targeting — shown for student audiences */}
            {(form.target_audience === "students" || form.target_audience === "paying_students") && (
              <div className="space-y-4 rounded-hec-md border border-hec-line bg-hec-sunken p-4">
                <p className="flex items-center gap-2 text-hec-small font-medium text-hec-ink-soft">
                  <Users className="h-4 w-4" /> Targeting Options
                </p>

                {/* Class scope */}
                <div className="space-y-2">
                  <Label htmlFor="ann-class-scope">Class Filter</Label>
                  <Select value={form.class_scope} onValueChange={(v) => setForm({ ...form, class_scope: v as "all" | "specific", target_class_ids: [], target_student_ids: [], student_scope: "all" })}>
                    <SelectTrigger id="ann-class-scope"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="specific">Specific Classes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.class_scope === "specific" && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-hec-md border border-hec-line bg-hec-raised p-2">
                    {allClasses.map((cls) => (
                      <label key={cls.id} className="flex min-h-hec-target cursor-pointer items-center gap-3 whitespace-normal break-words rounded-hec-sm px-2 py-2 text-hec-small text-hec-ink hover:bg-hec-sunken">
                        <Checkbox
                          checked={form.target_class_ids.includes(cls.id)}
                          onCheckedChange={(checked) => {
                            setForm((f) => ({
                              ...f,
                              target_class_ids: checked
                                ? [...f.target_class_ids, cls.id]
                                : f.target_class_ids.filter((id) => id !== cls.id),
                              target_student_ids: [],
                              student_scope: "all",
                            }));
                          }}
                        />
                        {cls.name}
                      </label>
                    ))}
                  </div>
                )}

                {/* Student scope */}
                <div className="space-y-2">
                  <Label htmlFor="ann-student-scope">Student Filter</Label>
                  <Select value={form.student_scope} onValueChange={(v) => setForm({ ...form, student_scope: v as "all" | "specific", target_student_ids: [] })}>
                    <SelectTrigger id="ann-student-scope"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students{form.class_scope === "specific" ? " (in selected classes)" : ""}</SelectItem>
                      <SelectItem value="specific">Specific Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.student_scope === "specific" && (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-hec-md border border-hec-line bg-hec-raised p-2">
                    {allStudents.length === 0 ? (
                      <p className="py-2 text-center text-hec-caption text-hec-ink-soft">No students found</p>
                    ) : allStudents.map((s: any) => (
                      <label key={s.id} className="flex min-h-hec-target cursor-pointer items-center gap-3 whitespace-normal break-words rounded-hec-sm px-2 py-2 text-hec-small text-hec-ink hover:bg-hec-sunken">
                        <Checkbox
                          checked={form.target_student_ids.includes(s.id)}
                          onCheckedChange={(checked) => {
                            setForm((f) => ({
                              ...f,
                              target_student_ids: checked
                                ? [...f.target_student_ids, s.id]
                                : f.target_student_ids.filter((id) => id !== s.id),
                            }));
                          }}
                        />
                        {s.full_name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ann-starts">Starts At (optional)</Label>
                <Input id="ann-starts" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-expires">Expires At (optional)</Label>
                <Input id="ann-expires" type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>

            {/* Style Config */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ann-bg">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label="Background Color" value={form.style_bg || "#7c3aed"} onChange={(e) => setForm({ ...form, style_bg: e.target.value })} className="h-11 w-11 shrink-0 cursor-pointer rounded-hec-sm border border-hec-line-strong bg-hec-raised" />
                  <Input id="ann-bg" value={form.style_bg} onChange={(e) => setForm({ ...form, style_bg: e.target.value })} placeholder="#hex" className="min-w-0 flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-text">Text Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label="Text Color" value={form.style_text || "#ffffff"} onChange={(e) => setForm({ ...form, style_text: e.target.value })} className="h-11 w-11 shrink-0 cursor-pointer rounded-hec-sm border border-hec-line-strong bg-hec-raised" />
                  <Input id="ann-text" value={form.style_text} onChange={(e) => setForm({ ...form, style_text: e.target.value })} placeholder="#hex" className="min-w-0 flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-animation">Animation</Label>
                <Select value={form.style_animation || "none"} onValueChange={(v) => setForm({ ...form, style_animation: v === "none" ? "" : v })}>
                  <SelectTrigger id="ann-animation"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pulse">Pulse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex min-h-hec-target items-center gap-2">
                <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex min-h-hec-target items-center gap-2">
                <Switch id="dismissible" checked={form.is_dismissible} onCheckedChange={(v) => setForm({ ...form, is_dismissible: v })} />
                <Label htmlFor="dismissible">Dismissible</Label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                {editingId ? "Save Changes" : "Create Announcement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
