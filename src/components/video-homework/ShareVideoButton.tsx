/**
 * "Share to Facebook" for an approved homework video.
 *
 * Facebook closed its Groups API in 2024, so no app can post into a group.
 * This hands the video file to the phone's own share sheet instead: the
 * parent or teacher taps Facebook, picks the class group and posts it as
 * themselves. Where a browser cannot share files (most computers), the
 * video is saved instead, to upload by hand.
 *
 * Two taps on purpose: phones only allow the share sheet straight after a
 * tap, and fetching a 50 MB video takes longer than that allowance. So the
 * first tap fetches, the second shares.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { extFor, signedVideoUrl } from "@/lib/video/recorder";
import { useIvory } from "@/hooks/useIvory";

interface Props {
  path: string;
  title: string;
  /** e.g. "Minh's video homework: My weekend" */
  text?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const safeName = (s: string) => s.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 60) || "homework-video";

export function ShareVideoButton({ path, title, text, size = "default", className }: Props) {
  const ivory = useIvory();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setFile(null), [path]);

  const canShareFiles = (f: File) => {
    try {
      return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [f] });
    } catch {
      return false;
    }
  };

  const saveToDevice = (f: File) => {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success("Video saved. Open your Facebook group and add it to a new post.");
  };

  const prepare = async () => {
    setLoading(true);
    try {
      const url = await signedVideoUrl(path, 600);
      if (!url) throw new Error("no link");
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const type = blob.type || "video/mp4";
      const f = new File([blob], `${safeName(title)}.${extFor(type)}`, { type });
      if (canShareFiles(f)) setFile(f);
      else saveToDevice(f);
    } catch {
      toast.error("Could not get the video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title, text: text ?? title });
    } catch (e: any) {
      if (e?.name === "AbortError") return; // they closed the share sheet
      saveToDevice(file);
    }
  };

  if (file) {
    return (
      <Button size={size} className={ivory ? className : `bg-[#1877F2] hover:bg-[#166FE5] text-white ${className ?? ""}`} onClick={share}>
        <Share2 className="h-4 w-4 mr-2" /> Share now - choose Facebook
      </Button>
    );
  }
  return (
    <Button size={size} variant={ivory ? "secondary" : "outline"} className={className} onClick={prepare} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {loading ? "Getting the video…" : "Share to Facebook"}
    </Button>
  );
}
