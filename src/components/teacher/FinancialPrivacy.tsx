import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { dur, ease, useMotionLevel } from "@/components/fx/motion";

// Display-only preference: whether money figures are shown on this device.
// Nothing is fetched or calculated differently; the figures are simply covered.
const STORAGE_KEY = "hec.teacher.hideFinancials";

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface PrivacyCtx {
  hidden: boolean;
  toggle: () => void;
}

const Ctx = createContext<PrivacyCtx>({ hidden: false, toggle: () => {} });

export function FinancialPrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(readStored);

  const toggle = useCallback(() => setHidden((h) => !h), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      /* storage can be blocked; the choice then lasts for this visit only */
    }
  }, [hidden]);

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFinancialPrivacy = () => useContext(Ctx);

/** Wraps a money figure; shows a soft masked placeholder while privacy is on. */
export function PrivateValue({ children, mask = "••••" }: { children: ReactNode; mask?: string }) {
  const { hidden } = useFinancialPrivacy();
  const level = useMotionLevel();
  return (
    <span className="relative inline-flex items-baseline">
      <AnimatePresence mode="wait" initial={false}>
        {hidden ? (
          <motion.span
            key="masked"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: level === "off" ? 0 : dur.press, ease }}
            className="select-none tracking-[0.18em] text-hec-ink-faint"
          >
            <span aria-hidden="true">{mask}</span>
            <span className="sr-only">Hidden</span>
          </motion.span>
        ) : (
          <motion.span
            key="shown"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: level === "off" ? 0 : dur.press, ease }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Elegant pill switch with a sliding thumb. */
export function FinancialPrivacyToggle({ className = "" }: { className?: string }) {
  const { hidden, toggle } = useFinancialPrivacy();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={hidden}
      onClick={toggle}
      className={`group inline-flex items-center gap-2.5 rounded-full border border-hec-line bg-hec-surface py-1 pl-3 pr-1 text-hec-small text-hec-ink-soft shadow-hec-1 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring ${className}`}
    >
      <span className="font-medium">{hidden ? "Earnings hidden" : "Hide earnings"}</span>
      <span
        aria-hidden="true"
        className={`relative flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
          hidden ? "bg-hec-ink" : "bg-hec-sunken"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-hec-surface shadow-hec-1 ${
            hidden ? "right-1" : "left-1"
          }`}
        >
          {hidden ? (
            <EyeOff className="h-3 w-3 text-hec-ink" />
          ) : (
            <Eye className="h-3 w-3 text-hec-ink-soft" />
          )}
        </motion.span>
      </span>
    </button>
  );
}
