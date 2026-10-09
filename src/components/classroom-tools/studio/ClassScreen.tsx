/**
 * Class screen — blow one tool up to fill the display.
 *
 * Most of these tools exist to be looked at by thirty children from the
 * back of a room, not by the teacher holding the laptop. Inside the panel
 * a die is 80px wide; on the projector it needs to be the whole wall.
 *
 * Tries the Fullscreen API first so the browser chrome disappears, and
 * falls back to a fixed overlay when it is unavailable or refused (iOS
 * Safari refuses it on anything that is not a <video>). Either way the
 * same overlay renders, so the feature never silently does nothing.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Minimize2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuietButton } from "./StudioKit";

export function ClassScreenButton({
  label = "Class screen",
  onClick,
  disabled,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <QuietButton onClick={onClick} disabled={disabled} aria-label={`Show on ${label}`}>
      <Monitor className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </QuietButton>
  );
}

export function ClassScreen({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Ask for real fullscreen once the overlay exists. A rejection is fine —
  // the overlay already covers the viewport on its own.
  useEffect(() => {
    if (!open) return;
    const el = hostRef.current;
    if (!el?.requestFullscreen) return;
    el.requestFullscreen().catch(() => {
      /* refused (iOS, permissions policy) — overlay still stands */
    });
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open]);

  // Leaving fullscreen by Esc or the browser's own control should close the
  // overlay too, otherwise the teacher is left on a full-page white panel
  // with no visible way out.
  useEffect(() => {
    if (!open) return;
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const close = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose();
  }, [onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={hostRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        "studio-surface fixed inset-0 z-[120] flex flex-col",
        "animate-in fade-in duration-200",
      )}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <h2 className="studio-title truncate text-2xl sm:text-3xl">{title}</h2>
        <QuietButton onClick={close} size="md" aria-label="Leave class screen">
          <Minimize2 className="h-4 w-4" aria-hidden />
          Exit
        </QuietButton>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 pb-10 sm:px-10">
        {children}
      </div>
    </div>,
    document.body,
  );
}
