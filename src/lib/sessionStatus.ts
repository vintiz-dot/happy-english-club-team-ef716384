import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Bangkok";

export type SessionStatus = "Scheduled" | "Held" | "Canceled" | "Holiday";

export interface SessionWithTime {
  date: string;
  start_time: string;
  status: SessionStatus;
}

/**
 * Determine the display status of a session based on date, time, and stored status
 * Rules:
 * 1. Canceled and Holiday always show their status
 * 2. Future sessions (date+time) always show as Scheduled regardless of stored status
 * 3. Past sessions show their actual status
 */
export function getSessionDisplayStatus(session: SessionWithTime): SessionStatus {
  // Rule 1: Special statuses always display
  if (session.status === "Canceled" || session.status === "Holiday") {
    return session.status;
  }
  
  // Parse session datetime in Bangkok timezone
  const sessionDateTime = new Date(`${session.date}T${session.start_time}`);
  const now = toZonedTime(new Date(), TIMEZONE);
  
  // Rule 2: Future sessions always show as Scheduled
  if (sessionDateTime > now) {
    return "Scheduled";
  }
  
  // Rule 3: Past or current sessions show actual status
  return session.status;
}

/**
 * Check if a session can be marked as Held
 * Future sessions cannot be marked as Held
 */
export function canMarkAsHeld(session: SessionWithTime): boolean {
  const sessionDateTime = new Date(`${session.date}T${session.start_time}`);
  const now = toZonedTime(new Date(), TIMEZONE);
  
  return sessionDateTime <= now;
}

/**
 * Get the status color class for calendar display
 */
export function getStatusColorClass(displayStatus: SessionStatus, isPast: boolean): string {
  if (displayStatus === "Canceled") return "bg-red-200 dark:bg-red-900";
  if (displayStatus === "Holiday") return "bg-slate-200 dark:bg-slate-900";
  if (displayStatus === "Held") return "bg-gray-200 dark:bg-gray-700";
  
  // Scheduled
  if (isPast) return "bg-orange-200 dark:bg-orange-900"; // Needs attention
  return "bg-green-200 dark:bg-green-900"; // Future scheduled
}
