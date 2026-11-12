import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import type { Announcement } from "@/hooks/useAnnouncements";
import { useIvory } from "@/hooks/useIvory";

interface Props {
  announcement: Announcement;
  onDismiss?: () => void;
}

// Renders on every area: Ivory classes on a listed route, the old ones byte for byte elsewhere.
// Ivory: the dialog recipe (DESIGN_SYSTEM s.15) - solid scrim, no blur, opens with a fade and an 8 px rise.
export const PopupAnnouncement = ({ announcement, onDismiss }: Props) => {
  const ivory = useIvory();
  const reduceMotion = useReducedMotion();
  const config = announcement.style_config || {};
  const bg = config.bg || undefined;
  const text = config.text || undefined;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className={ivory ? "absolute inset-0 bg-hec-scrim/60" : "absolute inset-0 bg-black/60 backdrop-blur-sm"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={announcement.is_dismissible ? onDismiss : undefined}
      />
      {/* Content */}
      <motion.div
        className={
          ivory
            ? "relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-raised text-hec-ink shadow-hec-3"
            : "relative z-10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden bg-card"
        }
        style={{ background: bg, color: text }}
        initial={ivory ? { y: 8, opacity: 0 } : { scale: 0.8, opacity: 0 }}
        animate={ivory ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        exit={ivory ? { y: 8, opacity: 0 } : { scale: 0.8, opacity: 0 }}
        transition={ivory ? { duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] } : { type: "spring", stiffness: 400, damping: 30 }}
      >
        {announcement.image_url && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={announcement.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        )}
        <div className="p-6">
          {announcement.title && (
            <h3
              className={
                ivory
                  ? // Clears the close button; the title wraps, never cut.
                    "mb-2 break-words pr-12 font-display text-hec-h2 font-medium text-balance"
                  : "text-xl font-bold mb-2"
              }
            >
              {announcement.title}
            </h3>
          )}
          {announcement.body && (
            <div
              className={ivory ? "prose prose-sm max-w-none text-hec-body opacity-90" : "text-sm opacity-80 prose prose-sm max-w-none"}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body) }}
            />
          )}
        </div>
        {announcement.is_dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Close announcement"
            className={
              ivory
                ? "absolute right-2 top-2 inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md bg-hec-raised text-hec-ink shadow-hec-1 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                : "absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors text-white"
            }
          >
            <X className={ivory ? "h-5 w-5" : "h-4 w-4"} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};
