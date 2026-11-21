import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PHOTO_KINDS, useAddLessonPhotos, useDeleteLessonPhoto, useLessonPhotos, type LessonPhoto } from "@/hooks/useLessonReport";

/**
 * Photos of a lesson's screen, whiteboard, worksheets and other material, for
 * its lesson report. For the lesson's teacher and a TA on the session (the
 * database decides; anyone else's upload is refused). Each photo is shrunk in
 * the browser before upload. Staff only: a family sees a photo only if the
 * teacher shares it in an approved report.
 */
export default function LessonPhotoCapture({ sessionId, classId, compact = false }: { sessionId: string; classId: string; compact?: boolean }) {
  const photos = useLessonPhotos(sessionId);
  const add = useAddLessonPhotos(sessionId, classId);
  const remove = useDeleteLessonPhoto(sessionId);
  const [kind, setKind] = useState<string>("whiteboard");
  const [caption, setCaption] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);

  const onFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    try {
      const { added, failed } = await add.mutateAsync({ files, kind, caption });
      if (added) toast.success(added === 1 ? "Photo added" : `${added} photos added`);
      for (const f of failed.slice(0, 3)) toast.error(f);
      if (added) setCaption("");
    } catch (e: any) {
      toast.error(e?.message ?? "The photo could not be added");
    } finally {
      if (camera.current) camera.current.value = "";
      if (library.current) library.current.value = "";
    }
  };

  const onDelete = async (p: LessonPhoto) => {
    if (!window.confirm("Delete this photo?")) return;
    try { await remove.mutateAsync(p); } catch (e: any) { toast.error(e?.message ?? "The photo could not be deleted"); }
  };

  const label = (k: string) => PHOTO_KINDS.find((x) => x.value === k)?.label ?? k;

  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-sm text-muted-foreground">
          Photos of the screen, whiteboard, worksheets or materials help write this lesson's report. Staff only until you share one in an approved report.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-40" aria-label="What the photo shows"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PHOTO_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="min-w-0 flex-1 basis-40" placeholder="Caption (optional)" maxLength={300}
          value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => camera.current?.click()} disabled={add.isPending}>
          {add.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
          Take photo
        </Button>
        <Button type="button" variant="outline" onClick={() => library.current?.click()} disabled={add.isPending}>
          <ImagePlus className="h-4 w-4 mr-2" /> Upload photos
        </Button>
        <input ref={camera} type="file" accept="image/*" capture="environment" multiple className="hidden"
          onChange={(e) => void onFiles(e.target.files)} />
        <input ref={library} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => void onFiles(e.target.files)} />
      </div>

      {photos.isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading photos…</p>
      ) : photos.error ? (
        <p className="text-sm text-muted-foreground">Lesson photos are not available yet.</p>
      ) : (photos.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos for this lesson yet.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(photos.data ?? []).map((p) => (
            <li key={p.id} className="relative rounded-md border overflow-hidden bg-muted">
              {p.url ? <img src={p.url} alt={p.caption || label(p.kind)} className="h-28 w-full object-cover" loading="lazy" />
                : <div className="h-28 w-full" />}
              <div className="p-1.5 text-xs">
                <span className="font-medium">{label(p.kind)}</span>
                {p.caption && <span className="block truncate text-muted-foreground">{p.caption}</span>}
              </div>
              <button type="button" onClick={() => void onDelete(p)} disabled={remove.isPending}
                className="absolute right-1 top-1 rounded bg-background/90 p-1 text-destructive hover:bg-background"
                aria-label="Delete photo">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
