import { motion } from "framer-motion";
import { Target, CheckCircle2, Circle, Sparkles, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Challenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
  icon: string;
}

interface DailyChallengesCardProps {
  challenges: Challenge[];
  onChallengeClick?: (challengeId: string) => void;
}

const defaultChallenges: Challenge[] = [
  { id: '1', title: 'Daily Check-In', description: 'Visit homework page (automatic)', xpReward: 1, progress: 0, target: 1, completed: false, icon: '✅' },
  { id: '2', title: 'Homework Hero', description: 'Complete 1 homework', xpReward: 20, progress: 0, target: 1, completed: false, icon: '📚' },
  { id: '3', title: 'Class Champion', description: 'Attend a class session', xpReward: 15, progress: 0, target: 1, completed: false, icon: '🎓' },
];

export function DailyChallengesCard({ 
  challenges = defaultChallenges,
  onChallengeClick 
}: DailyChallengesCardProps) {
  const completedCount = challenges.filter(c => c.completed).length;
  const allCompleted = completedCount === challenges.length;
  const totalXp = challenges.reduce((sum, c) => sum + (c.completed ? c.xpReward : 0), 0);
  const maxXp = challenges.reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <motion.div
      className="glass-lg rounded-3xl p-4 sm:p-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Celebration background when all complete */}
      {allCompleted && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-success/20 via-primary/10 to-accent/20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Sparkle particles when all complete */}
      {allCompleted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-xl"
              style={{ 
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180, 360],
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
        </div>
      )}

      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <motion.div
              className={`p-3 rounded-2xl ${
                allCompleted 
                  ? 'bg-gradient-to-br from-success to-success/70' 
                  : 'bg-gradient-to-br from-primary/20 to-primary/10'
              }`}
              animate={allCompleted ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 0.5, repeat: allCompleted ? Infinity : 0, repeatDelay: 2 }}
            >
              {allCompleted ? (
                <Sparkles className="h-6 w-6 text-white" />
              ) : (
                <Target className="h-6 w-6 text-primary" />
              )}
            </motion.div>
            <div>
              <h3 className="font-bold text-lg">Daily Challenges</h3>
              <p className="text-sm text-muted-foreground">
                {allCompleted ? 'All done! Come back tomorrow!' : `${completedCount}/${challenges.length} completed`}
              </p>
            </div>
          </div>
          
          {/* XP Badge */}
          <motion.div 
            className="shrink-0 flex items-center gap-1 whitespace-nowrap bg-gradient-to-r from-warning/20 to-warning/10 px-3 py-1.5 rounded-full"
            animate={allCompleted ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Sparkles className="h-4 w-4 text-warning" />
            <span className="font-bold text-warning">{totalXp}/{maxXp} XP</span>
          </motion.div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <Progress 
            value={(completedCount / challenges.length) * 100} 
            className="h-2 bg-muted/50"
          />
        </div>

        {/* Challenge List */}
        <div className="space-y-3">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              className={`flex items-center gap-3 sm:gap-4 p-3 rounded-2xl transition-all cursor-pointer ${
                challenge.completed 
                  ? 'bg-success/10 border border-success/20' 
                  : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ x: 4 }}
              onClick={() => onChallengeClick?.(challenge.id)}
            >
              {/* Icon */}
              <motion.div 
                className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl ${
                  challenge.completed 
                    ? 'bg-success/20' 
                    : 'bg-muted/50'
                }`}
                animate={challenge.completed ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {challenge.icon}
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold leading-snug break-words ${challenge.completed ? 'text-success' : 'text-foreground'}`}>
                    {challenge.title}
                  </p>
                  {challenge.completed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </motion.div>
                  )}
                </div>
                <p className="text-sm leading-snug text-muted-foreground break-words">{challenge.description}</p>
                
                {/* Progress bar for incomplete challenges */}
                {!challenge.completed && challenge.target > 1 && (
                  <div className="mt-2">
                    <Progress 
                      value={(challenge.progress / challenge.target) * 100} 
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {challenge.progress}/{challenge.target}
                    </p>
                  </div>
                )}
              </div>

              {/* XP Reward */}
              <div className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg ${
                challenge.completed 
                  ? 'bg-success/20 text-success' 
                  : 'bg-warning/10 text-warning'
              }`}>
                <span className="text-xs font-bold">+{challenge.xpReward}</span>
                <span className="text-xs">XP</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bonus Reward */}
        {allCompleted && (
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-4 text-center rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border border-primary/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Gift className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Bonus Reward Unlocked!</span>
            <span className="text-sm bg-primary text-primary-foreground px-2 py-0.5 rounded-full">+10 XP</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
