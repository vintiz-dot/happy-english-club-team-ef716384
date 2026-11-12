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
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
          backgroundSize: "200% 200%",
        }}
      >
        {/* Decorative dots */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20 border-4 border-white/30 shadow-xl">
            <AvatarImage src={getAvatarUrl(avatarUrl) || undefined} alt={name} className="object-cover" />
            <AvatarFallback className="text-xl font-bold bg-white/20 text-white">{initials}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 text-white space-y-1">
            <h3 className="text-2xl font-black drop-shadow-md">{name}</h3>
            {statusMessage && (
              <p className="text-sm italic text-white/80">"{statusMessage}"</p>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-white" />
              <span className="font-bold text-sm">{title}</span>
              <span className="text-white/60 text-xs ml-1">LV {level}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative flex justify-around mt-5 pt-4 border-t border-white/20">
          <div className="text-center text-white">
            <Zap className="h-5 w-5 mx-auto mb-1 fill-white" />
            <p className="text-xl font-black">{totalXp}</p>
            <p className="text-xs text-white/70">Total XP</p>
          </div>
          <div className="text-center text-white">
            <Star className="h-5 w-5 mx-auto mb-1 fill-white" />
            <p className="text-xl font-black">{level}</p>
            <p className="text-xs text-white/70">Level</p>
          </div>
          <div className="text-center text-white">
            <Flame className="h-5 w-5 mx-auto mb-1 fill-white" />
            <p className="text-xl font-black">{currentStreak}</p>
            <p className="text-xs text-white/70">Streak</p>
          </div>
        </div>

        {/* Watermark */}
        <p className="relative text-center text-[10px] text-white/40 mt-3 font-medium">
          Happy English Club ✨
        </p>
      </div>

      <Button
        onClick={handleShare}
        disabled={saving}
        variant="outline"
        className="w-full gap-2"
      >
        {saving ? (
          <>Saving...</>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            Share Profile Card
          </>
        )}
      </Button>
    </div>
  );
}
