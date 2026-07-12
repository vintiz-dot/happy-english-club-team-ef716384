/**
 * Hardcoded taxonomy constants for the Resource Hub tagging system.
 */

export const BLOOMS_LEVELS = [
  { value: "remember", label: "Remember", icon: "🧠", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "understand", label: "Understand", icon: "💡", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "apply", label: "Apply", icon: "🔧", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "analyze", label: "Analyze", icon: "🔍", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "evaluate", label: "Evaluate", icon: "⚖️", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "create", label: "Create", icon: "✨", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
] as const;

export const PYP_THEMES = [
  { value: "who_we_are", label: "Who We Are", icon: "👤", color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300" },
  { value: "where_we_are", label: "Where We Are in Place and Time", shortLabel: "Place & Time", icon: "🌍", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
  { value: "how_we_express", label: "How We Express Ourselves", shortLabel: "Expression", icon: "🎨", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "how_world_works", label: "How the World Works", shortLabel: "World Works", icon: "⚙️", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  { value: "how_we_organize", label: "How We Organize Ourselves", shortLabel: "Organization", icon: "📋", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { value: "sharing_planet", label: "Sharing the Planet", shortLabel: "Sharing", icon: "🌱", color: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300" },
] as const;

/** MIME type to human-readable category + icon mapping */
export const FILE_TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  "application/pdf": { label: "PDF", icon: "📄", color: "bg-red-500" },
  "application/msword": { label: "DOC", icon: "📝", color: "bg-blue-600" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "DOCX", icon: "📝", color: "bg-blue-600" },
  "application/vnd.ms-powerpoint": { label: "PPT", icon: "📊", color: "bg-orange-500" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { label: "PPTX", icon: "📊", color: "bg-orange-500" },
  "application/vnd.ms-excel": { label: "XLS", icon: "📈", color: "bg-green-600" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "XLSX", icon: "📈", color: "bg-green-600" },
  "video/mp4": { label: "Video", icon: "🎬", color: "bg-slate-600" },
  "video/webm": { label: "Video", icon: "🎬", color: "bg-slate-600" },
  "audio/mpeg": { label: "Audio", icon: "🎵", color: "bg-slate-500" },
  "audio/wav": { label: "Audio", icon: "🎵", color: "bg-slate-500" },
};

export function getFileTypeInfo(mimeType?: string | null) {
  if (!mimeType) return { label: "File", icon: "📁", color: "bg-slate-500" };
  if (mimeType.startsWith("image/")) return { label: "Image", icon: "🖼️", color: "bg-cyan-500" };
  if (mimeType.startsWith("video/")) return { label: "Video", icon: "🎬", color: "bg-slate-600" };
  if (mimeType.startsWith("audio/")) return { label: "Audio", icon: "🎵", color: "bg-slate-500" };
  return FILE_TYPE_MAP[mimeType] ?? { label: "File", icon: "📁", color: "bg-slate-500" };
}

export const ITEMS_PER_PAGE = 20;
