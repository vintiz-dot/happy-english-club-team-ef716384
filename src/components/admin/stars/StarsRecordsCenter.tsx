/**
 * Stars Sync: the records center.
 *
 * The log is every record Pixel Pal has ever sent and what became of it,
 * which is thousands of lines, most of them fine. So this screen leads with
 * the answer - what is stuck, and what single thing would unstick the most -
 * and then lets an admin slice the rest any way they like: quick views,
 * filters that say how many each option would show, grouping, sorting,
 * their choice of columns, and views of their own that they can save.
 *
 * Records show the child's name and never only a number. A child who is
 * linked shows HEC's name; one who is not shows Pixel Pal's, with a way to
 * link them from right there.
 *
 * Layout and saved views live in this browser only. They are a convenience,
 * and they hold no child's data beyond a chosen filter.
 */
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dayjs, todayKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { foldText } from "@/lib/starsNames";
import {
  ALL_COLUMNS, BLANK_VIEW, KIND_LABEL, RESULT_LABEL, RESULT_ORDER, VIEW_PRESETS, WHY_LABEL,
  applyPreset, clearFilters, computeFacets, countActiveFilters, countResults, filterRecords, findBlockers,
  groupRecords, reviveView, sortRecords, viewMatchesPreset,
  type Blocker, type ColumnKey, type FacetOption, type GroupKey, type KindKey, type RecordGroup, type RecordsView,
  type ResultKey, type SortKey, type StarsRecord, type WhyKey,
} from "@/lib/starsRecords";
import {
  ArrowDown, ArrowUp, Bookmark, Calendar, Check, ChevronRight, Clock, ExternalLink, Link2, ListFilter,
  Loader2, RefreshCw, RotateCcw, Search, SlidersHorizontal, X,
} from "lucide-react";
import { toast } from "sonner";

const VIEW_KEY = "hec.stars.records.view.v1";
const SAVED_KEY = "hec.stars.records.saved.v1";

interface SavedView {
  id: string;
  name: string;
  view: RecordsView;
}

function readStorage(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A private window, or storage turned off. The page still works; the
    // layout just will not be remembered.
  }
}

function readSaved(): SavedView[] {
  const raw = readStorage(SAVED_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const { id, name, view } = (entry ?? {}) as Partial<SavedView>;
    const revived = reviveView(view);
    return typeof id === "string" && typeof name === "string" && revived ? [{ id, name, view: revived }] : [];
  });
}

const attentionPreset = VIEW_PRESETS[0];

/** The last view, with a date-based preset such as Today moved up to today. */
function initialView(): RecordsView {
  const stored = readStorage(VIEW_KEY) as { view?: unknown; preset?: string } | null;
  const view = reviveView(stored?.view);
  if (!view) return applyPreset(BLANK_VIEW, attentionPreset, todayKey());
  const preset = VIEW_PRESETS.find((p) => p.key === stored?.preset);
  return preset ? applyPreset(view, preset, todayKey()) : view;
}

const RESULT_TONE: Record<ResultKey, string> = {
  settle: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
  refused: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
  waiting: "border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
  applied: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
  withdrawn: "border-hec-line bg-hec-sunken text-hec-ink-soft",
  duplicate: "border-hec-line bg-hec-sunken text-hec-ink-soft",
  before_start: "border-hec-line bg-hec-sunken text-hec-ink-soft",
};

function ResultBadge({ result, className }: { result: ResultKey; className?: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", RESULT_TONE[result], className)}>
      {RESULT_LABEL[result]}
    </Badge>
  );
}

const WHAT_TO_DO: Record<WhyKey, string> = {
  child_unlinked: "Link the child under Tools. Their waiting records apply on the next run.",
  class_unmapped: "Link the class under Tools. Its waiting records apply on the next run.",
  just_linked: "Nothing to do. This applies on the next run.",
  not_enrolled: "Enrol the child in that class from this date, or check they are linked to the right child.",
  no_lesson: "Generate the lesson in HEC. This applies on the next run.",
  not_started: "Nothing to do. This applies five minutes after the lesson starts.",
  teacher: "Under Setup, choose a teacher who teaches this class in HEC.",
  paused: "Under Setup, switch this class back on.",
  unsupported: "Nothing to do here. It is kept, and applies once HEC can take it.",
  no_homework: "Nothing to do. It applies once the homework it belongs to arrives.",
  late: "A teacher could not change this in HEC either. If it is right, enter it yourself.",
  over_limit: "If it was meant, raise the limit under Setup and enter it yourself.",
  cancelled: "The lesson is cancelled in HEC, so everybody on it is Excused.",
  too_old: "If it still matters, enter it yourself.",
  future: "The date is wrong in Pixel Pal. Correct it there.",
  unreadable: "Pixel Pal sent something HEC cannot read. It needs correcting in Pixel Pal.",
  refused_other: "Read the note above. If it is right, enter it yourself.",
  disagree: "Decide under To settle. HEC keeps its own until you do.",
  hec_edited: "HEC's version stands. Nothing is lost in Pixel Pal.",
};

const SORT_LABEL: Record<SortKey, string> = {
  lesson: "Lesson date",
  child: "Child",
  class: "Class",
  what: "What it says",
  result: "Result",
  why: "Why",
  processed: "Last looked at",
  tries: "Tries",
  seq: "Record no.",
};

const GROUP_LABEL: Record<GroupKey, string> = {
  none: "No grouping",
  child: "Child",
  class: "Class",
  lesson: "Lesson date",
  result: "Result",
  kind: "Type",
  why: "Reason",
};

const lessonLabel = (date: string | null) => (date ? dayjs(date).format("ddd D MMM") : "—");
const timeLabel = (at: string | null) => (at ? dayjs(at).tz().format("D MMM, HH:mm") : "—");
const pointsLabel = (points: number) => `${points > 0 ? "+" : ""}${points} pts`;

/* ------------------------------------------------------------ a filter */

function FacetFilter({ label, options, selected, onChange }: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", selected.length > 0 && "border-hec-brass bg-hec-sunken")}>
          {label}
          {selected.length > 0 && (
            <span className="rounded-full bg-hec-action px-2 text-hec-caption font-semibold tabular-nums text-hec-on-action">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={`Filter by ${label.toLowerCase()}`} className="w-[280px] p-0">
        {/* Names carry accents; typing "binh" has to find "Bình". */}
        <Command filter={(value, search) => (value.includes(foldText(search)) ? 1 : 0)}>
          {options.length > 7 && <CommandInput placeholder={`Find a ${label.toLowerCase()}`} />}
          <CommandList className="max-h-72">
            <CommandEmpty>Nothing here.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const on = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={foldText(`${option.label} ${option.sublabel ?? ""} ${option.value}`)}
                    onSelect={() => toggle(option.value)}
                    className="min-h-hec-target items-start gap-2 py-2"
                  >
                    <span className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-hec-sm border",
                      on ? "border-hec-action bg-hec-action text-hec-on-action" : "border-hec-line-strong",
                    )}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-normal break-words hyphens-none text-hec-small text-hec-ink">{option.label}</span>
                      {option.sublabel && <span className="block whitespace-normal break-words hyphens-none text-hec-caption text-hec-ink-soft">{option.sublabel}</span>}
                    </span>
                    <span className="shrink-0 text-hec-caption tabular-nums text-hec-ink-soft">{option.count}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="__clear__" onSelect={() => onChange([])} className="min-h-hec-target justify-center text-hec-small">
                    Clear
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DateFilter({ from, to, onChange }: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  const today = todayKey();
  const active = Boolean(from || to);
  const label = !active
    ? "Lesson date"
    : from === to
      ? lessonLabel(from)
      : `${from ? dayjs(from).format("D MMM") : "start"} – ${to ? dayjs(to).format("D MMM") : "now"}`;
  const quick: { label: string; from: string; to: string }[] = [
    { label: "Today", from: today, to: today },
    { label: "Last 7 days", from: dayjs(today).subtract(6, "day").format("YYYY-MM-DD"), to: today },
    { label: "This month", from: dayjs(today).startOf("month").format("YYYY-MM-DD"), to: today },
    { label: "Last month",
      from: dayjs(today).subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
      to: dayjs(today).subtract(1, "month").endOf("month").format("YYYY-MM-DD") },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", active && "border-hec-brass bg-hec-sunken")}>
          <Calendar className="h-4 w-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Filter by lesson date" className="w-[280px] space-y-4">
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Button key={q.label} size="sm" variant="secondary" onClick={() => onChange(q.from, q.to)}>
              {q.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stars-from-date" className="text-hec-small">From</Label>
            <Input id="stars-from-date" type="date" value={from ?? ""}
              onChange={(e) => onChange(e.target.value || null, to)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stars-to-date" className="text-hec-small">To</Label>
            <Input id="stars-to-date" type="date" value={to ?? ""}
              onChange={(e) => onChange(from, e.target.value || null)} />
          </div>
        </div>
        {active && (
          <Button size="sm" variant="ghost" className="w-full" onClick={() => onChange(null, null)}>
            Any date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------ the table */

function ChildCell({ record, compact, onLink }: { record: StarsRecord; compact: boolean; onLink: (ref: string) => void }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="min-w-[9rem] flex-1">
        <p className={cn("whitespace-normal break-words hyphens-none text-balance font-medium", record.childRef ? "text-hec-ink" : "text-hec-ink-soft")}>{record.childName}</p>
        {!compact && record.childRef && !record.childLinked && record.pixelPalName && (
          <p className="break-words text-hec-caption tabular-nums text-hec-ink-soft">Pixel Pal no. {record.childRef}</p>
        )}
        {!compact && record.childLinked && record.pixelPalName && record.pixelPalName !== record.childName && (
          <p className="whitespace-normal break-words hyphens-none text-hec-caption text-hec-ink-soft">“{record.pixelPalName}” in Pixel Pal</p>
        )}
      </div>
      {record.why === "child_unlinked" && record.childRef && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1"
          onClick={(e) => { e.stopPropagation(); onLink(record.childRef as string); }}
        >
          <Link2 className="h-4 w-4" /> Link
        </Button>
      )}
    </div>
  );
}

function RecordsTable({ records, view, onOpen, onLinkChild, onSort, sortable }: {
  records: StarsRecord[];
  view: RecordsView;
  onOpen: (record: StarsRecord) => void;
  onLinkChild: (ref: string) => void;
  onSort: (key: SortKey) => void;
  sortable: boolean;
}) {
  const compact = view.density === "compact";
  const cell = compact ? "px-2 py-1 text-hec-caption align-top" : "px-3 py-3 text-hec-small align-top";
  const columns = ALL_COLUMNS.filter((c) => view.columns.includes(c.key));

  const render = (key: ColumnKey, r: StarsRecord): ReactNode => {
    switch (key) {
      case "lesson": return <span className="whitespace-nowrap tabular-nums">{lessonLabel(r.lessonDate)}</span>;
      case "child": return <ChildCell record={r} compact={compact} onLink={onLinkChild} />;
      case "class": return <span className="block min-w-[7rem] max-w-[12rem] whitespace-normal break-words hyphens-none">{r.className}</span>;
      case "what": return (
        <span className="block max-w-[18rem] truncate" title={r.what}>
          {r.kind === "retraction" || r.kind === "other"
            ? r.what
            : <><span className="text-hec-ink-soft">{KIND_LABEL[r.kind]} · </span>{r.what}</>}
        </span>
      );
      case "result": return <ResultBadge result={r.result} />;
      case "why": return (
        <span className={cn("block max-w-[16rem] truncate", r.why ? "" : "text-hec-ink-soft")} title={r.note}>
          {r.why ? WHY_LABEL[r.why] : r.note || "—"}
        </span>
      );
      case "processed": return <span className="whitespace-nowrap tabular-nums text-hec-ink-soft">{timeLabel(r.processedAt)}</span>;
      case "tries": return <span className="tabular-nums text-hec-ink-soft">{r.attempts}</span>;
      case "seq": return <span className="font-mono text-hec-caption tabular-nums text-hec-ink-soft">{r.seq}</span>;
    }
  };

  return (
    <>
      {/* A table on a desktop... */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={cn("h-auto whitespace-nowrap", compact ? "px-2" : "px-3")}>
                  {sortable ? (
                    <button type="button" className="inline-flex min-h-hec-target min-w-hec-target items-center gap-1 rounded-hec-sm font-medium hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" onClick={() => onSort(c.key)}>
                      {c.label}
                      {view.sort === c.key && (view.descending ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />)}
                    </button>
                  ) : c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow
                key={r.id}
                tabIndex={0}
                className="cursor-pointer hover:bg-hec-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring focus-visible:-outline-offset-2"
                onClick={() => onOpen(r)}
                onKeyDown={(e) => { if (e.key === "Enter") onOpen(r); }}
              >
                {columns.map((c) => <TableCell key={c.key} className={cell}>{render(c.key, r)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ...and a list on a phone, where nine columns cannot fit. */}
      <ul className="rounded-hec-lg border border-hec-line bg-hec-surface md:hidden">
        {records.map((r) => (
          <li key={r.id} className="border-b border-hec-line last:border-b-0">
          <button
            type="button"
            onClick={() => onOpen(r)}
            className="block min-h-hec-target w-full px-4 py-3 text-left text-hec-small text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring focus-visible:-outline-offset-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium">{r.childName}</span>
              <ResultBadge result={r.result} className="shrink-0" />
            </div>
            <p className="mt-1 break-words text-hec-small text-hec-ink-soft">
              {lessonLabel(r.lessonDate)} · {r.className}
            </p>
            <p className="mt-1 break-words">{r.what}</p>
            {r.why && <p className="mt-1 break-words text-hec-ink-soft">{WHY_LABEL[r.why]}</p>}
          </button>
          </li>
        ))}
      </ul>
    </>
  );
}

const GROUP_PAGE = 30;
const ROWS_IN_GROUP = 25;

function GroupBlock({ group, defaultOpen, view, onOpen, onLinkChild, onSort }: {
  group: RecordGroup;
  defaultOpen: boolean;
  view: RecordsView;
  onOpen: (record: StarsRecord) => void;
  onLinkChild: (ref: string) => void;
  onSort: (key: SortKey) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [shown, setShown] = useState(ROWS_IN_GROUP);
  const { counts } = group;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-hec-lg border border-hec-line bg-hec-surface">
      <div className="flex flex-wrap items-center gap-2 pr-2">
        <CollapsibleTrigger className="flex min-h-hec-target min-w-0 flex-1 basis-60 flex-wrap items-start gap-2 rounded-hec-lg p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
          <ChevronRight className={cn("mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft transition-transform duration-hec-1 ease-hec", open && "rotate-90")} />
          <span className="min-w-0 flex-1">
            <span className="block whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">
              {view.groupBy === "lesson" ? lessonLabel(group.key || null) : group.label}
            </span>
            {group.sublabel && <span className="block whitespace-normal break-words hyphens-none text-hec-caption text-hec-ink-soft">{group.sublabel}</span>}
          </span>
          <span className="flex basis-full flex-wrap items-center gap-1 pl-6 sm:ml-auto sm:basis-auto sm:justify-end sm:pl-0">
            {RESULT_ORDER.filter((key) => counts[key]).map((key) => (
              <Badge key={key} variant="outline" className={cn("px-2 py-0 font-medium tabular-nums", RESULT_TONE[key])}>
                {counts[key]} {RESULT_LABEL[key].toLowerCase()}
              </Badge>
            ))}
            {group.waitingPoints !== 0 && (
              <span className="px-1 text-hec-caption tabular-nums text-hec-warn">{pointsLabel(group.waitingPoints)} held up</span>
            )}
            {group.appliedPoints !== 0 && (
              <span className="px-1 text-hec-caption tabular-nums text-hec-ink-soft">{pointsLabel(group.appliedPoints)} applied</span>
            )}
          </span>
        </CollapsibleTrigger>
        {group.linkChild && (
          <Button size="sm" variant="outline" className="shrink-0 gap-1"
            onClick={() => onLinkChild(group.linkChild as string)}>
            <Link2 className="h-4 w-4" /> Link
          </Button>
        )}
      </div>
      <CollapsibleContent className="space-y-2 border-t border-hec-line p-2">
        <RecordsTable records={group.records.slice(0, shown)} view={view} onOpen={onOpen} onLinkChild={onLinkChild} onSort={onSort} sortable />
        {group.records.length > shown && (
          <Button size="sm" variant="ghost" className="w-full" onClick={() => setShown((n) => n + ROWS_IN_GROUP * 2)}>
            Show more of {group.records.length}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ----------------------------------------------------------- the detail */

/** What the engine recorded about what it did, read aloud where it can be. */
function whatHecDid(record: StarsRecord): string | null {
  const ref = record.appliedRef as Record<string, unknown> | null;
  if (!ref || typeof ref !== "object") return null;
  if (ref.adopted) return "HEC already held this, so nothing was written. The two agree.";
  if (ref.table === "attendance") {
    const prev = ref.prev as { existed?: boolean; status?: string; marked_by?: string | null } | undefined;
    const wrote = typeof ref.wrote === "string" ? ref.wrote : "";
    if (!prev) return wrote ? `Wrote ${wrote} on the register.` : null;
    if (!prev.existed) return `Wrote ${wrote} on the register, where there was no mark.`;
    return prev.marked_by === null
      ? `Wrote ${wrote} over the seeded placeholder.`
      : `Wrote ${wrote}, replacing ${prev.status}.`;
  }
  if (ref.table === "point_transactions") return "Added to the child's points, marked as coming from Pixel Pal.";
  if (ref.table === "homeworks") return "Created the homework in HEC, as the teacher.";
  if (ref.table === "homework_submissions") return "Recorded the grade in HEC, as the teacher.";
  if (ref.withdrew) return "Withdrew the record it names.";
  return null;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-2 text-hec-small">
      <dt className="text-hec-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function RecordDetail({ record, onClose, onShowChild, onFix }: {
  record: StarsRecord | null;
  onClose: () => void;
  onShowChild: (ref: string) => void;
  onFix: (record: StarsRecord) => void;
}) {
  const did = record ? whatHecDid(record) : null;
  return (
    <Sheet open={record !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {record && (
          <>
            <SheetHeader className="space-y-2 pr-6 text-left">
              <div><ResultBadge result={record.result} /></div>
              <SheetTitle className="whitespace-normal break-words hyphens-none text-balance">{record.childName}</SheetTitle>
              <SheetDescription>{KIND_LABEL[record.kind]} · {lessonLabel(record.lessonDate)} · {record.className}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="rounded-hec-md border border-hec-line bg-hec-surface p-4 text-hec-small text-hec-ink">
                <p className="break-words font-medium">{record.what}</p>
                {record.note && <p className="mt-1 break-words text-hec-ink-soft">{record.note}</p>}
              </div>

              {record.why && (
                <div className="rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink">
                  <p className="font-medium">What to do</p>
                  <p className="mt-1 text-hec-ink-soft">{WHAT_TO_DO[record.why]}</p>
                  {record.fix && (
                    <Button size="sm" className="mt-4 w-full sm:w-auto" onClick={() => onFix(record)}>
                      {record.fix === "link_child" ? "Link this child"
                        : record.fix === "link_class" ? "Link this class"
                        : record.fix === "settle" ? "Go to To settle"
                        : "Go to Setup"}
                    </Button>
                  )}
                </div>
              )}

              {did && (
                <div className="rounded-hec-md border border-hec-line p-4 text-hec-small text-hec-ink">
                  <p className="font-medium">What HEC did</p>
                  <p className="mt-1 text-hec-ink-soft">{did}</p>
                </div>
              )}

              <dl className="divide-y divide-hec-line">
                <Fact label="Child">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 whitespace-normal break-words hyphens-none">{record.childName}</span>
                    {record.studentId && (
                      <Link to={`/students/${record.studentId}`} className="inline-flex min-h-hec-target items-center gap-1 rounded-hec-sm text-hec-small text-hec-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                        Open <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </span>
                </Fact>
                {record.childRef && (
                  <Fact label="In Pixel Pal">
                    {record.pixelPalName ? `${record.pixelPalName}, ` : ""}no. {record.childRef}
                    {!record.childLinked && " (not linked)"}
                  </Fact>
                )}
                <Fact label="Class">
                  {record.className}{record.classRef ? ` (Pixel Pal no. ${record.classRef})` : ""}
                </Fact>
                <Fact label="Lesson">{lessonLabel(record.lessonDate)}</Fact>
                <Fact label="Recorded">{timeLabel(record.occurredAt)} in Pixel Pal</Fact>
                <Fact label="Arrived">{timeLabel(record.receivedAt)}</Fact>
                <Fact label="Last looked at">{timeLabel(record.processedAt)}</Fact>
                <Fact label="Tries">{record.attempts}</Fact>
                <Fact label="Record no."><span className="font-mono text-hec-caption tabular-nums">{record.seq}</span></Fact>
              </dl>

              {record.childRef && (
                <Button variant="outline" size="sm" className="h-auto w-full whitespace-normal py-2 text-left" onClick={() => onShowChild(record.childRef as string)}>
                  <ListFilter className="h-4 w-4" /> Every record for {record.childName}
                </Button>
              )}

              <Collapsible>
                <CollapsibleTrigger className="flex min-h-hec-target w-full items-center gap-2 rounded-hec-sm text-hec-small text-hec-ink-soft hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                  <ChevronRight className="h-4 w-4" /> What Pixel Pal sent
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 overflow-x-auto rounded-hec-md bg-hec-sunken p-3 text-hec-caption text-hec-ink">
                    {JSON.stringify(record.payload, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------------------------------- the blockers */

function BlockerRow({ blocker, onShow, onFix }: {
  blocker: Blocker;
  onShow: (blocker: Blocker) => void;
  onFix: (blocker: Blocker) => void;
}) {
  const fixLabel = blocker.fix === "link_child" ? "Link child"
    : blocker.fix === "link_class" ? "Link class"
    : blocker.fix === "settle" ? "Settle"
    : blocker.fix === "setup" ? "Setup"
    : null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <p className="whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{blocker.headline}</p>
        <p className="text-hec-small text-hec-ink-soft">
          {blocker.count} record{blocker.count === 1 ? "" : "s"}
          {blocker.points !== 0 ? `, ${pointsLabel(blocker.points)}` : ""}
          {" · "}{WHAT_TO_DO[blocker.why]}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={() => onShow(blocker)}>Show</Button>
        {fixLabel && <Button size="sm" variant="outline" onClick={() => onFix(blocker)}>{fixLabel}</Button>}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------- the screen */

export interface RecordsFocus {
  /** Changes every time, so asking for the same child twice still works. */
  nonce: number;
  filters: Partial<RecordsView>;
}

export interface StarsRecordsCenterProps {
  records: StarsRecord[];
  loading: boolean;
  fetching: boolean;
  error: string | null;
  truncated: boolean;
  loadedAt: string | null;
  includeBeforeStart: boolean;
  onIncludeBeforeStart: (include: boolean) => void;
  beforeStartCount: number | null;
  onRefresh: () => void;
  /** Takes the admin to wherever this is fixed. */
  onFix: (fix: NonNullable<StarsRecord["fix"]>, target: { childRef?: string | null; classRef?: string | null }) => void;
  focus: RecordsFocus | null;
}

export function StarsRecordsCenter({
  records, loading, fetching, error, truncated, loadedAt, includeBeforeStart, onIncludeBeforeStart,
  beforeStartCount, onRefresh, onFix, focus,
}: StarsRecordsCenterProps) {
  const [view, setView] = useState<RecordsView>(initialView);
  const [saved, setSaved] = useState<SavedView[]>(readSaved);
  const [saveName, setSaveName] = useState("");
  const [page, setPage] = useState(0);
  const [shownGroups, setShownGroups] = useState(GROUP_PAGE);
  const [openRecord, setOpenRecord] = useState<StarsRecord | null>(null);
  const today = todayKey();

  // A few thousand rows are refiltered on every keystroke; this keeps the
  // typing itself from waiting for that.
  const deferred = useDeferredValue(view);

  const activePreset = VIEW_PRESETS.find((p) => viewMatchesPreset(view, p, today)) ?? null;

  useEffect(() => {
    writeStorage(VIEW_KEY, { view, preset: activePreset?.key ?? null });
  }, [view, activePreset?.key]);
  useEffect(() => { writeStorage(SAVED_KEY, saved); }, [saved]);
  useEffect(() => { setPage(0); setShownGroups(GROUP_PAGE); }, [deferred]);

  useEffect(() => {
    if (focus) setView((current) => ({ ...clearFilters(current), groupBy: "none", ...focus.filters }));
  }, [focus]);

  const patch = (next: Partial<RecordsView>) => setView((current) => ({ ...current, ...next }));

  const counts = useMemo(() => countResults(records), [records]);
  const blockers = useMemo(() => findBlockers(records), [records]);
  const facets = useMemo(() => computeFacets(records, deferred), [records, deferred]);
  const filtered = useMemo(() => filterRecords(records, deferred), [records, deferred]);
  const sorted = useMemo(() => sortRecords(filtered, deferred.sort, deferred.descending), [filtered, deferred.sort, deferred.descending]);
  const groups = useMemo(() => groupRecords(sorted, deferred.groupBy, deferred.descending), [sorted, deferred.groupBy, deferred.descending]);

  const filtersOn = countActiveFilters(view);
  const pages = Math.max(1, Math.ceil(sorted.length / view.pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageRows = sorted.slice(safePage * view.pageSize, (safePage + 1) * view.pageSize);

  const sortBy = (key: SortKey) => {
    setView((current) => (current.sort === key
      ? { ...current, descending: !current.descending }
      : { ...current, sort: key, descending: key === "lesson" || key === "processed" || key === "seq" }));
  };

  const toggleResult = (result: ResultKey) => {
    setView((current) => ({
      ...current,
      results: current.results.length === 1 && current.results[0] === result ? [] : [result],
    }));
  };

  const showBlocker = (blocker: Blocker) => {
    setView((current) => ({
      ...clearFilters(current),
      groupBy: "none",
      whys: [blocker.why],
      children: blocker.childRef ? [blocker.childRef] : [],
      classes: blocker.classRef ? [blocker.classRef] : [],
    }));
  };

  const saveCurrent = () => {
    const name = saveName.trim();
    if (!name) return;
    setSaved((current) => [...current.filter((s) => s.name !== name), { id: `${Date.now()}`, name, view }]);
    setSaveName("");
    toast.success(`Saved "${name}". It stays in this browser.`);
  };

  const showChild = (ref: string) => {
    setOpenRecord(null);
    setView((current) => ({ ...clearFilters(current), groupBy: "none", children: [ref], sort: "lesson", descending: true }));
  };

  const stuck = counts.settle + counts.refused + counts.waiting;

  if (error) {
    return (
      <Card className="border-hec-danger/30 bg-hec-danger-tint">
        <CardHeader>
          <CardTitle className="text-hec-danger">The records could not be loaded</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={onRefresh}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------- at a glance */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="group" aria-label="Records by result">
        {RESULT_ORDER.filter((key) => key !== "before_start" || includeBeforeStart).map((key) => {
          const on = view.results.length === 1 && view.results[0] === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleResult(key)}
              aria-pressed={on}
              className={cn(
                "min-h-hec-target rounded-hec-lg border border-hec-line bg-hec-surface p-3 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                on && "border-hec-brass bg-hec-sunken",
              )}
            >
              <p className={cn("font-sans text-hec-h2 font-semibold tabular-nums text-hec-ink", counts[key] > 0 && (key === "settle" || key === "refused") && "text-hec-danger", counts[key] > 0 && key === "waiting" && "text-hec-warn")}>
                {loading ? "…" : counts[key].toLocaleString()}
              </p>
              <p className="text-hec-caption text-hec-ink-soft">{RESULT_LABEL[key]}</p>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------- what is holding it up */}
      {blockers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>What is holding records up</CardTitle>
            <CardDescription className="tabular-nums">
              {stuck.toLocaleString()} stuck, from {blockers.length} cause{blockers.length === 1 ? "" : "s"}. Biggest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-hec-line">
              {blockers.slice(0, 5).map((blocker) => (
                <BlockerRow
                  key={blocker.key}
                  blocker={blocker}
                  onShow={showBlocker}
                  onFix={(b) => { if (b.fix) onFix(b.fix, { childRef: b.childRef, classRef: b.classRef }); }}
                />
              ))}
            </ul>
            {blockers.length > 5 && (
              <Button size="sm" variant="ghost" className="mt-2 w-full"
                onClick={() => setView((current) => ({ ...clearFilters(current), results: ["settle", "refused", "waiting"], groupBy: "why" }))}>
                See all {blockers.length} causes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ choosing a view */}
      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-6">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick views">
            {VIEW_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant={activePreset?.key === preset.key ? "default" : "outline"}
                className="rounded-full"
                aria-pressed={activePreset?.key === preset.key}
                title={preset.description}
                onClick={() => setView((current) => applyPreset(current, preset, today))}
              >
                {preset.label}
              </Button>
            ))}
            {saved.map((s) => {
              const on = JSON.stringify(s.view) === JSON.stringify(view);
              return (
                <span key={s.id} className={cn(
                  "inline-flex items-center rounded-full border text-hec-small",
                  on ? "border-hec-action bg-hec-action text-hec-on-action" : "border-hec-line-strong bg-hec-raised text-hec-ink",
                )}>
                  <button type="button" className="inline-flex min-h-hec-target items-center gap-1 rounded-full pl-3 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" onClick={() => setView(s.view)}>
                    <Bookmark className="h-4 w-4" /> {s.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete saved view ${s.name}`}
                    className="inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-full opacity-80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                    onClick={() => setSaved((current) => current.filter((v) => v.id !== s.id))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hec-ink-faint" aria-hidden="true" />
              <Input
                aria-label="Search the records"
                placeholder="Child, class, reason, number…"
                className="pl-9"
                value={view.search}
                onChange={(e) => patch({ search: e.target.value })}
              />
            </div>
            <FacetFilter label="Result" options={facets.results} selected={view.results} onChange={(results) => patch({ results: results as ResultKey[] })} />
            <FacetFilter label="Type" options={facets.kinds} selected={view.kinds} onChange={(kinds) => patch({ kinds: kinds as KindKey[] })} />
            <FacetFilter label="Class" options={facets.classes} selected={view.classes} onChange={(classes) => patch({ classes })} />
            <FacetFilter label="Child" options={facets.children} selected={view.children} onChange={(children) => patch({ children })} />
            <FacetFilter label="Reason" options={facets.whys} selected={view.whys} onChange={(whys) => patch({ whys: whys as WhyKey[] })} />
            {facets.categories.length > 0 && (
              <FacetFilter label="Points type" options={facets.categories} selected={view.categories} onChange={(categories) => patch({ categories })} />
            )}
            <DateFilter from={view.from} to={view.to} onChange={(from, to) => patch({ from, to })} />
            {filtersOn > 0 && (
              <Button size="sm" variant="ghost" className="gap-1 tabular-nums" onClick={() => setView((current) => clearFilters(current))}>
                <RotateCcw className="h-4 w-4" /> Clear {filtersOn}
              </Button>
            )}

            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
              <Select value={view.groupBy} onValueChange={(groupBy) => patch({ groupBy: groupBy as GroupKey })}>
                <SelectTrigger aria-label="Group by" className="w-full gap-1 text-hec-small sm:w-[190px]">
                  <span className="text-hec-ink-soft">Group:</span> <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GROUP_LABEL) as GroupKey[]).map((key) => (
                    <SelectItem key={key} value={key}>{GROUP_LABEL[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex w-full items-center sm:w-auto">
                <Select value={view.sort} onValueChange={(sort) => patch({ sort: sort as SortKey })}>
                  <SelectTrigger aria-label="Sort by" className="w-full gap-1 rounded-r-none text-hec-small sm:w-[190px]">
                    <span className="text-hec-ink-soft">Sort:</span> <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                      <SelectItem key={key} value={key}>{SORT_LABEL[key]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-l-none border-l-0"
                  aria-label={view.descending ? "Sorted high to low, change" : "Sorted low to high, change"}
                  onClick={() => patch({ descending: !view.descending })}
                >
                  {view.descending ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" /> Customize
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" aria-label="Customize the view" className="w-[280px] space-y-4">
                  <div>
                    <p className="mb-2 text-hec-small font-medium text-hec-ink">Columns</p>
                    <div className="grid grid-cols-2 gap-1">
                      {ALL_COLUMNS.map((column) => {
                        const on = view.columns.includes(column.key);
                        return (
                          <button
                            key={column.key}
                            type="button"
                            aria-pressed={on}
                            className={cn(
                              "flex min-h-hec-target items-center gap-2 rounded-hec-sm px-2 text-left text-hec-small hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                              on ? "text-hec-ink" : "text-hec-ink-soft",
                            )}
                            onClick={() => {
                              const next = on ? view.columns.filter((c) => c !== column.key) : [...view.columns, column.key];
                              if (next.length > 0) patch({ columns: next });
                            }}
                          >
                            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-hec-sm border", on ? "border-hec-action bg-hec-action text-hec-on-action" : "border-hec-line-strong")}>
                              {on && <Check className="h-3 w-3" />}
                            </span>
                            {column.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex min-h-hec-target items-center justify-between gap-2">
                    <Label htmlFor="stars-compact" className="text-hec-small font-medium">Compact rows</Label>
                    <Switch id="stars-compact" checked={view.density === "compact"} onCheckedChange={(on) => patch({ density: on ? "compact" : "comfortable" })} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="stars-page-size" className="text-hec-small font-medium">Rows on a page</Label>
                    <Select value={String(view.pageSize)} onValueChange={(size) => patch({ pageSize: Number(size) })}>
                      <SelectTrigger id="stars-page-size" className="w-[96px] text-hec-small tabular-nums"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[25, 50, 100, 200].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex min-h-hec-target items-center justify-between gap-2">
                    <Label htmlFor="stars-before-start" className="text-hec-small font-medium tabular-nums">
                      Records before the start date{beforeStartCount !== null ? ` (${beforeStartCount.toLocaleString()})` : ""}
                    </Label>
                    <Switch id="stars-before-start" checked={includeBeforeStart} onCheckedChange={onIncludeBeforeStart} />
                  </div>
                  <div className="space-y-2 border-t border-hec-line pt-4">
                    <Label htmlFor="stars-save-name" className="text-hec-small font-medium">Save this view</Label>
                    <div className="flex gap-2">
                      <Input
                        id="stars-save-name"
                        placeholder="Name it"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveCurrent(); }}
                      />
                      <Button size="sm" disabled={!saveName.trim()} onClick={saveCurrent}>Save</Button>
                    </div>
                    <p className="text-hec-caption text-hec-ink-soft">Filters, grouping, sorting and columns. Kept in this browser.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------- the rows */}
      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-hec-small text-hec-ink-soft">
            <p className="tabular-nums">
              {loading
                ? "Loading the records…"
                : <>
                    <strong className="font-semibold text-hec-ink">{sorted.length.toLocaleString()}</strong>
                    {" "}of {records.length.toLocaleString()} record{records.length === 1 ? "" : "s"}
                    {deferred.groupBy !== "none" && `, in ${groups.length} group${groups.length === 1 ? "" : "s"}`}
                  </>}
            </p>
            <div className="flex items-center gap-2">
              {loadedAt && <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-4 w-4" aria-hidden="true" /> {dayjs(loadedAt).tz().format("HH:mm")}</span>}
              <Button variant="ghost" size="sm" className="gap-1" onClick={onRefresh} disabled={fetching}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
              </Button>
            </div>
          </div>

          {truncated && (
            <p className="rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-3 text-hec-small text-hec-ink">
              This is the newest 20,000 records. Older ones are in the log but not loaded here.
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-hec-small text-hec-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : records.length === 0 ? (
            <p className="py-12 text-center text-hec-small text-hec-ink-soft">Nothing yet. Pixel Pal has not been read.</p>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-hec-small text-hec-ink-soft">
              <p>{filtersOn > 0 ? "No records match this view." : "Nothing to show."}</p>
              {filtersOn > 0 && (
                <Button variant="link" size="sm" onClick={() => setView((current) => clearFilters(current))}>Clear the filters</Button>
              )}
            </div>
          ) : deferred.groupBy !== "none" ? (
            <div className="space-y-2">
              {groups.slice(0, shownGroups).map((group) => (
                <GroupBlock
                  key={`${deferred.groupBy}:${group.key}`}
                  group={group}
                  defaultOpen={groups.length <= 6}
                  view={view}
                  onOpen={setOpenRecord}
                  onLinkChild={(childRef) => onFix("link_child", { childRef })}
                  onSort={sortBy}
                />
              ))}
              {groups.length > shownGroups && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShownGroups((n) => n + GROUP_PAGE)}>
                  Show more ({groups.length - shownGroups} left)
                </Button>
              )}
            </div>
          ) : (
            <>
              <RecordsTable
                records={pageRows}
                view={view}
                onOpen={setOpenRecord}
                onLinkChild={(childRef) => onFix("link_child", { childRef })}
                onSort={sortBy}
                sortable
              />
              {pages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-hec-small text-hec-ink-soft">
                  <span className="tabular-nums">Page {safePage + 1} of {pages}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <RecordDetail
        record={openRecord}
        onClose={() => setOpenRecord(null)}
        onShowChild={showChild}
        onFix={(record) => {
          setOpenRecord(null);
          if (record.fix) onFix(record.fix, { childRef: record.childRef, classRef: record.classRef });
        }}
      />
    </div>
  );
}
