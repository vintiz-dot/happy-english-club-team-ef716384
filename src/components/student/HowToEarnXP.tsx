import { Sparkles, X, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARD_TITLE } from "@/components/student/nova/ivory";

interface HowToEarnXPProps {
  onClose?: () => void;
}

const xpCategories = [
  {
    title: "Daily Activities",
    icon: "🌟",
    items: [
      { name: "Daily Check-In", description: "Visit your homework page (automatic!)", xp: "+1 XP", icon: "✅" },
    ]
  },
  {
    title: "Class Participation",
    icon: "🎓",
    items: [
      { name: "Speaking", description: "Answer questions, good pronunciation", xp: "+1-10 XP", icon: "🗣️" },
      { name: "Listening", description: "Follow instructions, active listening", xp: "+1-10 XP", icon: "👂" },
      { name: "Reading", description: "Read aloud with expression", xp: "+1-10 XP", icon: "📖" },
      { name: "Writing", description: "Neat handwriting, creative writing", xp: "+1-10 XP", icon: "✏️" },
    ]
  },
  {
    title: "Homework",
    icon: "📚",
    items: [
      { name: "Complete Homework", description: "Turn in your assignments (max 100 pts)", xp: "+1-100 XP", icon: "📝" },
      { name: "Early Submission", description: "Submit before due date", xp: "+5 XP bonus", icon: "⏰" },
    ]
  },
  {
    title: "Good Behaviors",
    icon: "⭐",
    items: [
      { name: "Focus Points", description: "Stay on task, no distractions", xp: "+1-10 XP", icon: "🎯" },
      { name: "Teamwork", description: "Help classmates, collaborate", xp: "+1-10 XP", icon: "🤝" },
    ]
  },
  {
    title: "Attendance Bonus",
    icon: "🔥",
    items: [
      { name: "5-Class Streak", description: "Attend 5 consecutive classes", xp: "+50 Focus XP", icon: "🏆" },
    ]
  },
  {
    title: "Reading & Theory",
    icon: "📕",
    items: [
      { name: "Quizzes & Exercises", description: "Complete theory work (no limit!)", xp: "Unlimited", icon: "📊" },
    ]
  },
];

/** How XP is earned, in the "Ivory" design system: quiet lists, the XP figures in ink. */
export function HowToEarnXP({ onClose }: HowToEarnXPProps) {
  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hec-sunken">
            <Sparkles className="h-5 w-5 text-hec-ink-soft" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={CARD_TITLE}>
              How to Earn XP!
            </h2>
            <p className="text-hec-small text-hec-ink-soft">Level up by doing awesome things!</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="min-h-hec-target min-w-hec-target rounded-full" aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* XP Categories */}
      <div className="space-y-6">
        {xpCategories.map((category) => (
          <section key={category.title}>
            <h3 className="mb-2 flex items-center gap-2 border-b border-hec-line pb-2 text-hec-h3 font-semibold text-hec-ink">
              <span aria-hidden>{category.icon}</span>
              {category.title}
            </h3>

            <ul className="divide-y divide-hec-line">
              {category.items.map((item) => (
                <li key={item.name} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="text-xl" aria-hidden>{item.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-hec-ink">{item.name}</p>
                      <p className="text-hec-small text-hec-ink-soft">{item.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-hec-small font-semibold tabular-nums text-hec-ink">{item.xp}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Tips Section */}
        <section className="rounded-hec-md bg-hec-sunken/60 p-4 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 text-hec-h3 font-semibold text-hec-ink">
            <span aria-hidden>💡</span>
            Pro Tips!
          </h3>
          <ul className="space-y-2 text-hec-small text-hec-ink-soft">
            <li className="flex items-start gap-2">
              <Star className="mt-1 h-4 w-4 flex-shrink-0 text-hec-ink-faint" aria-hidden />
              <span>Check your homework page every day to earn your daily XP!</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="mt-1 h-4 w-4 flex-shrink-0 text-hec-ink-faint" aria-hidden />
              <span>Attend all your scheduled classes to build up your attendance streak!</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="mt-1 h-4 w-4 flex-shrink-0 text-hec-ink-faint" aria-hidden />
              <span>Participate in class - speaking and listening earns points!</span>
            </li>
            <li className="flex items-start gap-2">
              <Trophy className="mt-1 h-4 w-4 flex-shrink-0 text-hec-ink-faint" aria-hidden />
              <span>Every 5 classes you attend in a row = +50 Focus XP bonus!</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
