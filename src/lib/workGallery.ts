/**
 * Student work gallery - the shapes the database functions return and the
 * pure grouping / sorting the screens share. Nothing here decides who may see
 * what: admin_work_gallery / teacher_work_gallery / class_work_gallery do
 * (supabase/migrations/20261118100000_student_work_gallery.sql).
 */

export type WorkSource = "student_work" | "homework" | "video";
export type ShareStatus = "pending" | "approved" | "declined";

export interface WorkStudent {
  id: string;
  name: string;
  family_id?: string | null;
  family_name?: string | null;
  active?: boolean;
}

export interface WorkItem {
  source: WorkSource;
  source_id: string;
  class_id: string | null;
  class_name: string | null;
  students: WorkStudent[];
  title: string;
  bucket: string;
  file_path: string | null;
  external_url: string | null;
  kind: "file" | "link" | "video";
  workflow: string;
  status: string;
  work_at: string;
  is_teamwork: boolean;
  share_id: string | null;
  share_status: ShareStatus | null;
}

/** One approved item of a class gallery, as a child or family sees it. */
export interface ClassWorkItem {
  share_id: string;
  class_id: string;
  class_name: string | null;
  title: string;
  kind: "file" | "link" | "video";
  file_name: string | null;
  external_url: string | null;
  students: { id: string; name: string }[];
  work_at: string;
  is_teamwork: boolean;
}

export type GroupBy = "school" | "class" | "family" | "student";

export interface WorkGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|avif)$/i;
export const isImagePath = (path: string | null | undefined): boolean => !!path && IMAGE_EXT.test(path);

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
const newest = (a: { work_at: string }, b: { work_at: string }) => b.work_at.localeCompare(a.work_at);

/**
 * Group items and sort the groups by name (newest work first inside a group).
 * A teamwork piece sits under every member of its family / student group, and
 * once under its class. "school" is one group: the whole school.
 */
export function groupWork(items: WorkItem[], by: GroupBy): WorkGroup<WorkItem>[] {
  if (by === "school") {
    return [{ key: "school", label: "Whole school", items: [...items].sort(newest) }];
  }
  const map = new Map<string, WorkGroup<WorkItem>>();
  const add = (key: string, label: string, item: WorkItem) => {
    const g = map.get(key) ?? { key, label, items: [] };
    if (!g.items.includes(item)) g.items.push(item);
    map.set(key, g);
  };
  for (const item of items) {
    if (by === "class") {
      add(item.class_id ?? "none", item.class_name ?? "No class yet", item);
    } else if (by === "family") {
      for (const s of item.students) add(s.family_id ?? "none", s.family_name ?? "No family", item);
    } else {
      for (const s of item.students) add(s.id, s.name, item);
    }
  }
  const groups = [...map.values()];
  for (const g of groups) g.items.sort(newest);
  // "No class" / "No family" go last, the rest by name.
  return groups.sort((a, b) => {
    const an = a.key === "none" ? 1 : 0;
    const bn = b.key === "none" ? 1 : 0;
    return an - bn || byName(a.label, b.label);
  });
}

/** Free-text filter over names, class, family and title. */
export function filterWork(items: WorkItem[], q: string): WorkItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((i) =>
    [i.title, i.class_name ?? "", ...i.students.flatMap((s) => [s.name, s.family_name ?? ""])]
      .some((t) => t.toLowerCase().includes(needle)));
}

export const studentNames = (students: { name: string }[]): string =>
  students.map((s) => s.name).join(", ");

export const sourceLabel = (s: WorkSource): string =>
  s === "student_work" ? "Classwork" : s === "homework" ? "Homework file" : "Video";
