import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAvatarUrl } from "@/lib/avatars";
import { getLevelTitle } from "@/lib/levelUtils";
import { Share2, Download, Star, Zap, Flame } from "lucide-react";
import { toast } from "sonner";

interface ProfileShareCardProps {
  name: string;
  avatarUrl?: string | null;
  level: number;
  totalXp: number;
  currentStreak: number;
  statusMessage?: string | null;
}

export function ProfileShareCard({
  name,
  avatarUrl,
  level,
  totalXp,
  currentStreak,
  statusMessage,
}: ProfileShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");

      // Try native share first, fallback to download
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${name}-profile.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${name}'s Profile Card` });
          toast.success("Shared!");
          setSaving(false);
          return;
        }
      }

      // Fallback: download
      const link = document.createElement("a");
      link.download = `${name}-profile.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Profile card saved!");
    } catch (e) {
      toast.error("Failed to capture profile card");
    }
    setSaving(false);
  };

  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const title = getLevelTitle(level);

  return (
    <div className="space-y-4">
      {/* The card that is saved as an image: ink, ivory type, one brass rule. */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-hec-lg bg-hec-action p-6 text-hec-on-action shadow-hec-2"
      >
        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20 shrink-0 border border-hec-on-action/30">
            <AvatarImage src={getAvatarUrl(avatarUrl) || undefined} alt={name} className="object-cover" />
            <AvatarFallback className="bg-hec-on-action/10 font-sans text-xl font-semibold text-hec-on-action">{initials}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="whitespace-normal break-words text-balance font-display text-hec-h1 font-medium [hyphens:none]">{name}</h3>
            {statusMessage && (
              <p className="break-words text-hec-small italic text-hec-on-action/80">"{statusMessage}"</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-hec-small font-medium">{title}</span>
              <span className="text-hec-caption tabular-nums text-hec-on-action/80">LV {level}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-hec-brass pt-4">
          <div className="text-center">
            <Zap className="mx-auto mb-1 h-5 w-5 text-hec-on-action/80" aria-hidden />
            <p className="font-sans text-hec-h2 font-semibold tabular-nums">{totalXp}</p>
            <p className="text-hec-caption text-hec-on-action/80">Total XP</p>
          </div>
          <div className="text-center">
            <Star className="mx-auto mb-1 h-5 w-5 text-hec-on-action/80" aria-hidden />
            <p className="font-sans text-hec-h2 font-semibold tabular-nums">{level}</p>
            <p className="text-hec-caption text-hec-on-action/80">Level</p>
          </div>
          <div className="text-center">
            <Flame className="mx-auto mb-1 h-5 w-5 text-hec-on-action/80" aria-hidden />
            <p className="font-sans text-hec-h2 font-semibold tabular-nums">{currentStreak}</p>
            <p className="text-hec-caption text-hec-on-action/80">Streak</p>
          </div>
        </div>

        {/* Watermark */}
        <p className="relative mt-4 text-center font-display text-hec-caption tracking-wider text-hec-on-action/80">
          Happy English Club ✨
        </p>
      </div>

      <button
        type="button"
        onClick={handleShare}
        disabled={saving}
        className="inline-flex min-h-hec-target w-full items-center justify-center gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised px-6 text-hec-body font-medium text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
      >
        {saving ? (
          <>Saving...</>
        ) : (
          <>
            <Share2 className="h-4 w-4" aria-hidden />
            Share Profile Card
          </>
        )}
      </button>
    </div>
  );
}
