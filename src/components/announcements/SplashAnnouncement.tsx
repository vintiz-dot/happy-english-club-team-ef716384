import { motion } from "framer-motion";
import { X } from "lucide-react";

import { useEffect, useState } from "react";
import { useIvory } from "@/hooks/useIvory";
import type { Announcement } from "@/hooks/useAnnouncements";

interface Props {
  announcement: Announcement;
  onDismiss?: () => void;
}

// Rendered on every area: ivory classes only while the route is in the system
// (useIvory), the old strings unchanged elsewhere. The admin's HTML body
// (the iframe) is their own document and is not restyled.
export const SplashAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const config = announcement.style_config || {};
  const bg = config.bg || "hsl(var(--background))";
  const text = config.text || "hsl(var(--foreground))";
  const autoDismissSeconds = config.auto_dismiss ? parseInt(config.auto_dismiss, 10) : 0;
  const [countdown, setCountdown] = useState(autoDismissSeconds);

  useEffect(() => {
    if (autoDismissSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onDismiss?.();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoDismissSeconds, onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: bg, color: text }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Full-viewport HTML body */}
      <motion.div
        className="flex-1 overflow-auto"
        tabIndex={ivory ? 0 : undefined}
        role={ivory ? "region" : undefined}
        aria-label={ivory ? "Announcement" : undefined}
        initial={ivory ? { y: 8, opacity: 0 } : { scale: 0.97, opacity: 0 }}
        animate={ivory ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={ivory ? { delay: 0.2, duration: 0.42, ease: [0.22, 1, 0.36, 1] } : { delay: 0.2, type: "spring", stiffness: 200, damping: 25 }}
      >
        {announcement.image_url && !announcement.body && (
          <div className="flex items-center justify-center min-h-full p-4 pt-[8vh]">
            <img
              src={announcement.image_url}
              alt=""
              className={ivory ? "max-h-[80vh] max-w-[95vw] rounded-hec-lg object-contain" : "max-w-[95vw] max-h-[80vh] object-contain rounded-2xl"}
              loading="eager"
              fetchPriority="high"
            />
          </div>
        )}
        {announcement.body ? (
          <iframe
            srcDoc={announcement.body}
            sandbox="allow-same-origin"
            className="w-full h-full border-0"
            title="Announcement content"
            style={{ colorScheme: "normal" }}
          />
        ) : announcement.title ? (
          <div className="flex flex-col items-center justify-center min-h-full gap-4 p-6">
            {announcement.image_url && (
              <img
                src={announcement.image_url}
                alt=""
                className={ivory ? "max-h-[60vh] max-w-[95vw] rounded-hec-lg object-contain" : "max-w-[95vw] max-h-[60vh] object-contain rounded-2xl"}
                loading="eager"
                fetchPriority="high"
              />
            )}
            <h1 className={ivory ? "max-w-2xl break-words text-balance text-center font-display text-hec-display font-medium" : "text-3xl md:text-4xl font-bold"}>{announcement.title}</h1>
          </div>
        ) : null}
      </motion.div>

      {/* Fixed bottom Continue button */}
      {announcement.is_dismissible && onDismiss && (
        <div
          className={ivory ? "flex shrink-0 justify-center px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]" : "shrink-0 flex justify-center py-4 px-6"}
          style={{ background: bg }}
        >
          <button
            onClick={onDismiss}
            className={
              ivory
                ? "inline-flex min-h-hec-target w-full items-center justify-center rounded-hec-md bg-hec-action px-6 text-hec-body font-medium tabular-nums text-hec-on-action transition-colors duration-hec-1 ease-hec hover:bg-hec-action/90 sm:w-auto sm:min-w-[12rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                : "px-10 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-lg hover:opacity-90 transition-opacity"
            }
          >
            {countdown > 0 ? `Continue (${countdown}s)` : "Continue"}
          </button>
        </div>
      )}

      {/* Fixed X button */}
      {announcement.is_dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          aria-label={ivory ? "Close" : undefined}
          className={
            ivory
              ? "absolute right-4 top-4 z-10 inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-full bg-hec-raised text-hec-ink shadow-hec-1 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
              : "absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-colors"
          }
        >
          <X className={ivory ? "h-5 w-5" : "h-6 w-6 text-white drop-shadow"} />
        </button>
      )}
    </motion.div>
  );
};
