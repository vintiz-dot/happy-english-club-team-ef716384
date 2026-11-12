import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { givenName } from "@/lib/givenName";

interface MascotCompanionProps {
  studentName?: string;
  streak?: number;
  pendingHomework?: number;
  level?: number;
  /**
   * Where the message is drawn. The hero passes a row in the normal flow
   * under the child's name; the message is rendered there (a portal into
   * that row), so it can never sit on top of the name.
   */
  messageSlot?: HTMLElement | null;
}

const expressions = {
  happy: "😊",
  excited: "🤩",
  encouraging: "💪",
  celebrating: "🎉",
  thinking: "🤔",
  sleeping: "😴",
  loving: "🥰",
  cool: "😎",
};

const mascotMessages = [
  { condition: "high_streak", message: "Amazing streak! Keep it up! 🔥", expression: "excited" },
  { condition: "no_homework", message: "All homework done! You rock! ⭐", expression: "celebrating" },
  { condition: "has_homework", message: "You've got this! Let's finish that homework!", expression: "encouraging" },
  { condition: "morning", message: "Good morning! Ready for adventure?", expression: "happy" },
  { condition: "evening", message: "Great work today! Rest well! 🌙", expression: "loving" },
  { condition: "default", message: "Let's learn something awesome!", expression: "happy" },
];

export function MascotCompanion({ studentName, streak = 0, pendingHomework = 0, level = 1, messageSlot }: MascotCompanionProps) {
  const [showBubble, setShowBubble] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(mascotMessages[5]);
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();

    if (streak >= 7) {
      setCurrentMessage(mascotMessages[0]);
    } else if (pendingHomework === 0) {
      setCurrentMessage(mascotMessages[1]);
    } else if (pendingHomework > 0) {
      setCurrentMessage(mascotMessages[2]);
    } else if (hour < 12) {
      setCurrentMessage(mascotMessages[3]);
    } else if (hour >= 18) {
      setCurrentMessage(mascotMessages[4]);
    } else {
      setCurrentMessage(mascotMessages[5]);
    }

    // Wave animation on mount
    setIsWaving(true);
    const waveTimer = setTimeout(() => setIsWaving(false), 2000);

    // Hide bubble after 8 seconds
    const bubbleTimer = setTimeout(() => setShowBubble(false), 8000);

    return () => {
      clearTimeout(waveTimer);
      clearTimeout(bubbleTimer);
    };
  }, [streak, pendingHomework]);

  const handleMascotClick = () => {
    setShowBubble(true);
    setIsWaving(true);

    // Cycle through random messages
    const randomIndex = Math.floor(Math.random() * mascotMessages.length);
    setCurrentMessage(mascotMessages[randomIndex]);

    setTimeout(() => setIsWaving(false), 1500);
    setTimeout(() => setShowBubble(false), 6000);
  };

  // Ivory (A4.2): the message is a calm line in the flow and stays; an in-flow
  // element that disappeared would move the page under the child's finger.
  // showBubble / isWaving keep their timers but no longer move or hide anything.
  void showBubble; void isWaving;
  // Vietnamese names are family name first: greet the child by the given name ("Anh"), not "Nguyễn".
  const called = givenName(studentName);
  const message = `${called ? `Hey ${called}! ` : ''}${currentMessage.message}`;

  return (
    <div className="relative">
      {/* Mascot: a quiet ink disc. Tapping it picks another message. */}
      <div
        className="relative flex h-14 w-14 cursor-pointer select-none items-center justify-center rounded-full bg-hec-action text-3xl shadow-hec-1 [[data-hec-scale=young]_&]:h-16 [[data-hec-scale=young]_&]:w-16"
        onClick={handleMascotClick}
      >
        <span aria-hidden>{expressions[currentMessage.expression as keyof typeof expressions] || "😊"}</span>
        {/* Level on the mascot */}
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-hec-line bg-hec-surface px-1 text-hec-caption font-semibold tabular-nums text-hec-ink">
          {level}
        </span>
      </div>

      {messageSlot &&
        createPortal(
          <p
            role="status"
            className="rounded-hec-md border border-hec-line bg-hec-paper px-4 py-3 text-hec-body text-hec-ink"
          >
            {message}
          </p>,
          messageSlot,
        )}
    </div>
  );
}
