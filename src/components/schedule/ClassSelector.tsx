import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, User, ChevronRight } from "lucide-react";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import { getSessionDisplayStatus } from "@/lib/sessionStatus";

interface ClassSelectorProps {
  date: Date;
  sessions: any[];
  onSelectSession: (session: any) => void;
  onClose: () => void;
}

const getStatusStyle = (session: any) => {
  const displayStatus = getSessionDisplayStatus({
    date: session.date,
    start_time: session.start_time,
    status: session.status,
  });
  
  switch (displayStatus) {
    case "Held":
      return { bg: "bg-hec-sunken", border: "border-hec-line", icon: "✓" };
    case "Canceled":
      return { bg: "bg-hec-danger-tint", border: "border-hec-danger/30", icon: "✕" };
    case "Holiday":
      return { bg: "bg-hec-sunken", border: "border-hec-line", icon: "🎉" };
    default:
      return { bg: "bg-hec-surface", border: "border-hec-line-strong", icon: "✨" };
  }
};

export default function ClassSelector({ date, sessions, onSelectSession, onClose }: ClassSelectorProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Select Class
            </DialogTitle>
            <p className="mt-1 text-hec-small tabular-nums text-hec-ink-soft">
              {dayjs(date).format("dddd, MMMM D, YYYY")} • {sessions.length} {sessions.length === 1 ? 'class' : 'classes'}
            </p>
          </DialogHeader>
        </div>

        {/* Sessions list */}
        <div className="px-6 pb-2 max-h-[50vh] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {sessions.map((session, index) => {
              const statusStyle = getStatusStyle(session);
              
              return (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                  className={cn(
                    "mb-3 w-full min-h-hec-target rounded-hec-md border p-4 text-left text-hec-ink transition-shadow duration-hec-1 ease-hec",
                    "group flex cursor-pointer items-center justify-between gap-3",
                    "hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                    statusStyle.bg,
                    statusStyle.border
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{statusStyle.icon}</span>
                      <h3 className="min-w-0 whitespace-normal break-words text-hec-body font-semibold text-hec-ink">
                        {session.classes?.name}
                      </h3>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-hec-small text-hec-ink-soft">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="tabular-nums">
                          {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      
                      {session.teachers?.full_name && (
                        <div className="flex min-w-0 items-start gap-2">
                          <User className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="min-w-0 whitespace-normal break-words">{session.teachers.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0.5, x: -5 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="shrink-0"
                  >
                    <ChevronRight className="h-5 w-5 text-hec-ink-faint transition-colors duration-hec-1 ease-hec group-hover:text-hec-brass" />
                  </motion.div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
