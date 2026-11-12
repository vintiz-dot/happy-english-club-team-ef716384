import { motion, useReducedMotion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";
import { Star, Zap } from "lucide-react";
import { getLevelTitle } from "@/lib/levelUtils";
import { reducedMotion } from "@/components/student/nova/ivory";

interface LevelProgressRingProps {
  avatarUrl?: string | null;
  name: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  totalXp: number;
  size?: "sm" | "md" | "lg";
  /**
   * "Ivory" design system look (student dashboard, A4.2): brass arc on a
   * sunken track, initials in the sans, no glow, no orbiting sparkles, the
   * level and its title in the flow under the ring. Off by default, so the
   * other screens that use this ring are unchanged.
   */
  ivory?: boolean;
}

export function LevelProgressRing({
  avatarUrl,
  name,
  level,
  currentXp,
  nextLevelXp,
  progress,
  totalXp,
  size = "lg",
  ivory = false,
}: LevelProgressRingProps) {
  const reduceMotion = reducedMotion(useReducedMotion());
  const dimensions = {
    sm: { ring: 80, avatar: 60, stroke: 3, badge: "text-xs px-2 py-0.5" },
    md: { ring: 110, avatar: 84, stroke: 4, badge: "text-sm px-3 py-1" },
    lg: { ring: 140, avatar: 108, stroke: 5, badge: "text-sm px-3 py-1.5" },
  };

  const { ring, avatar, stroke, badge } = dimensions[size];
  const radius = (ring - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  if (ivory) {
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: ring, height: ring }}>
          <svg width={ring} height={ring} className="-rotate-90" aria-hidden>
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={radius}
              fill="none"
              className="stroke-hec-sunken"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={ring / 2}
              cy={ring / 2}
              r={radius}
              fill="none"
              className="stroke-hec-brass"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={reduceMotion ? false : { strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            />
          </svg>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: avatar, height: avatar }}
          >
            <Avatar className="h-full w-full border border-hec-line" style={{ width: avatar, height: avatar }}>
              <AvatarImage src={getAvatarUrl(avatarUrl) || undefined} alt={name} className="object-cover" />
              <AvatarFallback className="bg-hec-surface font-sans text-hec-h2 font-semibold text-hec-ink">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {/* Total XP */}
          <span className="absolute -right-3 -top-1 inline-flex items-center gap-1 rounded-full border border-hec-line bg-hec-surface px-2 py-0.5 text-hec-caption font-medium tabular-nums text-hec-ink shadow-hec-1">
            <Zap className="h-3 w-3 text-hec-ink-soft" aria-hidden />
            {totalXp}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-hec-action px-3 py-0.5 text-hec-caption font-semibold tabular-nums text-hec-on-action">
          LV {level}
        </span>
        <span className="text-center text-hec-small text-hec-ink-soft">{getLevelTitle(level)}</span>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-2xl"
        style={{ width: ring, height: ring }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* XP Progress Ring */}
      <svg 
        width={ring} 
        height={ring} 
        className="relative -rotate-90"
        style={{ filter: 'drop-shadow(0 4px 20px hsla(var(--primary), 0.3))' }}
      >
        {/* Background ring */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          className="opacity-30"
        />
        
        {/* Progress ring with gradient */}
        <motion.circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />

        {/* Glowing tip */}
        <motion.circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="url(#glowGradient)"
          strokeWidth={stroke + 2}
          strokeLinecap="round"
          strokeDasharray={`${stroke * 2} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          style={{ filter: 'blur(2px)' }}
        />
        
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Avatar in center */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: avatar, height: avatar }}
      >
        <Avatar 
          className="w-full h-full border-4 border-background shadow-2xl"
          style={{ width: avatar, height: avatar }}
        >
          <AvatarImage 
            src={getAvatarUrl(avatarUrl) || undefined} 
            alt={name} 
            className="object-cover" 
          />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-accent text-white">
            {name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Level Badge */}
      <motion.div 
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-lg flex items-center gap-1 ${badge}`}
        initial={{ scale: 0, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", delay: 0.8, stiffness: 400 }}
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s linear infinite',
        }}
      >
        <Star className="h-3.5 w-3.5 text-white fill-white" />
        <span className="font-black text-white">LV {level}</span>
      </motion.div>

      {/* Level Title */}
      <motion.div
        className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-xs font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {getLevelTitle(level)}
        </span>
      </motion.div>

      {/* Floating XP indicator */}
      <motion.div
        className="absolute -top-2 -right-2 flex items-center gap-1 bg-gradient-to-r from-warning to-warning/80 rounded-full px-2 py-1 shadow-lg"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", delay: 1, stiffness: 300 }}
      >
        <Zap className="h-3 w-3 text-white fill-white" />
        <span className="text-xs font-bold text-white">{totalXp}</span>
      </motion.div>

      {/* Sparkles around ring */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.div
          key={i}
          className="absolute text-xs"
          style={{
            left: `${50 + 55 * Math.cos((angle - 90) * Math.PI / 180)}%`,
            top: `${50 + 55 * Math.sin((angle - 90) * Math.PI / 180)}%`,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [0.5, 1, 0.5],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          ✨
        </motion.div>
      ))}
    </motion.div>
  );
}
