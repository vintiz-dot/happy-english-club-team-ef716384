import { motion } from "framer-motion";
import { Flame, Calendar, Snowflake } from "lucide-react";
import { dayjs } from "@/lib/date";

interface DailyStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  weekActivity: boolean[]; // 7 days, true = active
  streakFreezeAvailable?: boolean;
}

const streakMessages = [
  { min: 0, max: 0, message: "Start your streak today! 🚀", color: "muted" },
  { min: 1, max: 2, message: "Great start! Keep going! 💪", color: "warning" },
  { min: 3, max: 6, message: "You're on fire! 🔥", color: "warning" },
  { min: 7, max: 13, message: "One week strong! Amazing! 🌟", color: "primary" },
  { min: 14, max: 29, message: "Two weeks! You're unstoppable! 🚀", color: "primary" },
  { min: 30, max: Infinity, message: "LEGENDARY! A whole month! 👑", color: "accent" },
];

export function DailyStreakCard({ 
  currentStreak, 
  longestStreak, 
  weekActivity,
  streakFreezeAvailable = false 
}: DailyStreakCardProps) {
  const streakInfo = streakMessages.find(s => currentStreak >= s.min && currentStreak <= s.max) || streakMessages[0];
  
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = dayjs().day(); // 0 = Sunday, 1 = Monday
  const mondayOffset = today === 0 ? 6 : today - 1; // Convert to Monday = 0

  return (
    <motion.div
      className="glass-lg rounded-3xl p-4 sm:p-6 relative overflow-hidden min-w-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Background gradient based on streak */}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        currentStreak >= 7 
          ? 'from-warning/20 via-primary/10 to-accent/20' 
          : currentStreak >= 3
            ? 'from-warning/15 to-warning/5'
            : 'from-muted/10 to-muted/5'
      } pointer-events-none`} />

      {/* Fire particles for high streaks */}
      {currentStreak >= 7 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{ 
                left: `${20 + i * 15}%`,
                bottom: '-20%'
              }}
              animate={{
                y: [0, -100, -200],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut"
              }}
            >
              🔥
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className={`p-3 rounded-2xl ${
                currentStreak >= 3 
                  ? 'bg-gradient-to-br from-warning to-warning/70' 
                  : 'bg-gradient-to-br from-muted to-muted/70'
              }`}
              animate={currentStreak >= 3 ? {
                scale: [1, 1.1, 1],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className={`h-6 w-6 ${currentStreak >= 3 ? 'text-white' : 'text-muted-foreground'}`} />
            </motion.div>
            <div>
              <h3 className="font-bold text-lg">Daily Streak</h3>
              <p className="text-sm text-muted-foreground">{streakInfo.message}</p>
            </div>
          </div>
          
          {streakFreezeAvailable && (
            <motion.div 
              className="p-2 rounded-xl bg-accent/20 border border-accent/30"
              whileHover={{ scale: 1.1 }}
              title="Streak freeze available"
            >
              <Snowflake className="h-5 w-5 text-accent" />
            </motion.div>
          )}
        </div>

        {/* Streak Number */}
        <div className="flex items-baseline gap-2">
          <motion.span
            className={`text-6xl font-black ${
              currentStreak >= 7 
                ? 'bg-gradient-to-r from-warning via-primary to-accent bg-clip-text text-transparent' 
                : currentStreak >= 3
                  ? 'text-warning'
                  : 'text-foreground'
            }`}
            key={currentStreak}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {currentStreak}
          </motion.span>
          <span className="text-xl text-muted-foreground font-medium">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Week Calendar */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const isToday = index === mondayOffset;
            const isActive = weekActivity[index];
            
            return (
              <motion.div
                key={index}
                className={`min-w-0 flex flex-col items-center gap-1 py-2 sm:p-2 rounded-xl transition-all ${
                  isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {day}
                </span>
                <motion.div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                    isActive 
                      ? 'bg-gradient-to-br from-warning to-warning/70 shadow-lg' 
                      : 'bg-muted/50'
                  }`}
                  animate={isActive && isToday ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {isActive ? (
                    <span className="text-sm">🔥</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">•</span>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Best Streak */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-sm text-muted-foreground">Best streak</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-foreground">{longestStreak}</span>
            <span className="text-sm text-muted-foreground">days</span>
            {currentStreak >= longestStreak && currentStreak > 0 && (
              <motion.span 
                className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                NEW!
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
