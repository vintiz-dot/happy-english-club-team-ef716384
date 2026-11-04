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
  settle: "border-destructive/40 bg-destructive/10 text-destructive",
  refused: "border-destructive/40 bg-destructive/10 text-destructive",
  waiting: "border-warning/50 bg-warning/10 text-warning",
  applied: "border-success/40 bg-success/10 text-success",
  withdrawn: "border-border bg-muted text-muted-foreground",
  duplicate: "border-border bg-muted text-muted-foreground",
  before_start: "border-border bg-muted text-muted-foreground",
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
        <Button variant="outline" size="sm" className={cn("h-8 gap-1.5", selected.length > 0 && "border-primary/60 bg-primary/5")}>
          {label}
          {selected.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-4 text-primary-foreground">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
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
                    className="gap-2"
                  >
                    <span className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.sublabel && <span className="block truncate text-[11px] text-muted-foreground">{option.sublabel}</span>}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{option.count}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="__clear__" onSelect={() => onChange([])} className="justify-center text-xs">
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
        <Button variant="outline" size="sm" className={cn("h-8 gap-1.5", active && "border-primary/60 bg-primary/5")}>
          <Calendar className="h-3.5 w-3.5" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <Button key={q.label} size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onChange(q.from, q.to)}>
              {q.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="stars-from-date" className="text-xs">From</Label>
            <Input id="stars-from-date" type="date" className="h-8 px-2 text-xs" value={from ?? ""}
              onChange={(e) => onChange(e.target.value || null, to)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stars-to-date" className="text-xs">To</Label>
            <Input id="stars-to-date" type="date" className="h-8 px-2 text-xs" value={to ?? ""}
              onChange={(e) => onChange(from, e.target.value || null)} />
          </div>
        </div>
        {active && (
          <Button size="sm" variant="ghost" className="h-7 w-full text-xs" onClick={() => onChange(null, null)}>
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
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0">
        <p className={cn("truncate font-medium", record.childRef ? "" : "text-muted-foreground")}>{record.childName}</p>
        {!compact && record.childRef && !record.childLinked && record.pixelPalName && (
          <p className="truncate text-[11px] text-muted-foreground">Pixel Pal no. {record.childRef}</p>
        )}
        {!compact && record.childLinked && record.pixelPalName && record.pixelPalName !== record.childName && (
          <p className="truncate text-[11px] text-muted-foreground">“{record.pixelPalName}” in Pixel Pal</p>
        )}
      </div>
      {record.why === "child_unlinked" && record.childRef && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 shrink-0 gap-1 px-1.5 text-[11px]"
          onClick={(e) => { e.stopPropagation(); onLink(record.childRef as string); }}
        >
          <Link2 className="h-3 w-3" /> Link
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
  const cell = compact ? "px-2 py-1 text-xs" : "px-3 py-2.5 text-sm";
  const columns = ALL_COLUMNS.filter((c) => view.columns.includes(c.key));

  const render = (key: ColumnKey, r: StarsRecord): ReactNode => {
    switch (key) {
      case "lesson": return <span className="whitespace-nowrap">{lessonLabel(r.lessonDate)}</span>;
      case "child": return <ChildCell record={r} compact={compact} onLink={onLinkChild} />;
      case "class": return <span className="block max-w-[10rem] truncate">{r.className}</span>;
      case "what": return (
        <span className="block max-w-[18rem] truncate" title={r.what}>
          {r.kind === "retraction" || r.kind === "other"
            ? r.what
            : <><span className="text-muted-foreground">{KIND_LABEL[r.kind]} · </span>{r.what}</>}
        </span>
      );
      case "result": return <ResultBadge result={r.result} />;
      case "why": return (
        <span className={cn("block max-w-[16rem] truncate", r.why ? "" : "text-muted-foreground")} title={r.note}>
          {r.why ? WHY_LABEL[r.why] : r.note || "—"}
        </span>
      );
      case "processed": return <span className="whitespace-nowrap text-muted-foreground">{timeLabel(r.processedAt)}</span>;
      case "tries": return <span className="tabular-nums text-muted-foreground">{r.attempts}</span>;
      case "seq": return <span className="font-mono text-xs text-muted-foreground">{r.seq}</span>;
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
                <TableHead key={c.key} className={cn("h-9 whitespace-nowrap", compact ? "px-2 text-xs" : "px-3")}>
                  {sortable ? (
                    <button type="button" className="inline-flex items-center gap-1 font-medium hover:text-foreground" onClick={() => onSort(c.key)}>
                      {c.label}
                      {view.sort === c.key && (view.descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
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
                className="cursor-pointer"
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
      <div className="space-y-1.5 md:hidden">
        {records.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpen(r)}
            className="block w-full rounded-lg border bg-card/60 p-2.5 text-left text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{r.childName}</span>
              <ResultBadge result={r.result} className="shrink-0" />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {lessonLabel(r.lessonDate)} · {r.className}
            </p>
            <p className="mt-0.5 truncate text-xs">{r.what}</p>
            {r.why && <p className="mt-0.5 truncate text-xs text-muted-foreground">{WHY_LABEL[r.why]}</p>}
          </button>
        ))}
      </div>
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
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <div className="flex items-center gap-2 pr-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 p-2.5 text-left">
          <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {view.groupBy === "lesson" ? lessonLabel(group.key || null) : group.label}
            </span>
            {group.sublabel && <span className="block truncate text-[11px] text-muted-foreground">{group.sublabel}</span>}
          </span>
          <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
            {RESULT_ORDER.filter((key) => counts[key]).map((key) => (
              <Badge key={key} variant="outline" className={cn("px-1.5 py-0 text-[11px] font-medium", RESULT_TONE[key])}>
                {counts[key]} {RESULT_LABEL[key].toLowerCase()}
              </Badge>
            ))}
            {group.waitingPoints !== 0 && (
              <span className="px-1 text-[11px] text-warning">{pointsLabel(group.waitingPoints)} held up</span>
            )}
            {group.appliedPoints !== 0 && (
              <span className="px-1 text-[11px] text-muted-foreground">{pointsLabel(group.appliedPoints)} applied</span>
            )}
          </span>
        </CollapsibleTrigger>
        {group.linkChild && (
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-xs"
            onClick={() => onLinkChild(group.linkChild as string)}>
            <Link2 className="h-3 w-3" /> Link
          </Button>
        )}
      </div>
      <CollapsibleContent className="space-y-2 border-t p-2">
        <RecordsTable records={group.records.slice(0, shown)} view={view} onOpen={onOpen} onLinkChild={onLinkChild} onSort={onSort} sortable />
        {group.records.length > shown && (
          <Button size="sm" variant="ghost" className="h-7 w-full text-xs" onClick={() => setShown((n) => n + ROWS_IN_GROUP * 2)}>
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
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
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
              <SheetTitle className="text-lg">{record.childName}</SheetTitle>
              <SheetDescription>{KIND_LABEL[record.kind]} · {lessonLabel(record.lessonDate)} · {record.className}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{record.what}</p>
                {record.note && <p className="mt-1 text-muted-foreground">{record.note}</p>}
              </div>

              {record.why && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="font-medium">What to do</p>
                  <p className="mt-1 text-muted-foreground">{WHAT_TO_DO[record.why]}</p>
                  {record.fix && (
                    <Button size="sm" className="mt-2 h-8" onClick={() => onFix(record)}>
                      {record.fix === "link_child" ? "Link this child"
                        : record.fix === "link_class" ? "Link this class"
                        : record.fix === "settle" ? "Go to To settle"
                        : "Go to Setup"}
                    </Button>
                  )}
                </div>
              )}

              {did && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">What HEC did</p>
                  <p className="mt-1 text-muted-foreground">{did}</p>
                </div>
              )}

              <dl className="divide-y">
                <Fact label="Child">
                  <span className="flex flex-wrap items-center gap-2">
                    {record.childName}
                    {record.studentId && (
                      <Link to={`/students/${record.studentId}`} className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
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
                <Fact label="Record no."><span className="font-mono text-xs">{record.seq}</span></Fact>
              </dl>

              {record.childRef && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => onShowChild(record.childRef as string)}>
                  <ListFilter className="mr-2 h-3.5 w-3.5" /> Every record for {record.childName}
                </Button>
              )}

              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-3 w-3" /> What Pixel Pal sent
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-[11px]">
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
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{blocker.headline}</p>
        <p className="text-xs text-muted-foreground">
          {blocker.count} record{blocker.count === 1 ? "" : "s"}
          {blocker.points !== 0 ? `, ${pointsLabel(blocker.points)}` : ""}
          {" · "}{WHAT_TO_DO[blocker.why]}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onShow(blocker)}>Show</Button>
        {fixLabel && <Button size="sm" className="h-7 text-xs" onClick={() => onFix(blocker)}>{fixLabel}</Button>}
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
      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="text-base">The records could not be loaded</CardTitle>
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {RESULT_ORDER.filter((key) => key !== "before_start" || includeBeforeStart).map((key) => {
          const on = view.results.length === 1 && view.results[0] === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleResult(key)}
              aria-pressed={on}
              className={cn(
                "rounded-xl border bg-card/60 p-3 text-left transition-colors hover:bg-muted/50",
                on && "ring-2 ring-primary",
              )}
            >
              <p className={cn("text-xl font-semibold tabular-nums", counts[key] > 0 && (key === "settle" || key === "refused") && "text-destructive", counts[key] > 0 && key === "waiting" && "text-warning")}>
                {loading ? "…" : counts[key].toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{RESULT_LABEL[key]}</p>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------- what is holding it up */}
      {blockers.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">What is holding records up</CardTitle>
            <CardDescription>
              {stuck.toLocaleString()} stuck, from {blockers.length} cause{blockers.length === 1 ? "" : "s"}. Biggest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
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
              <Button size="sm" variant="ghost" className="mt-1 h-7 w-full text-xs"
                onClick={() => setView((current) => ({ ...clearFilters(current), results: ["settle", "refused", "waiting"], groupBy: "why" }))}>
                See all {blockers.length} causes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ choosing a view */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick views">
            {VIEW_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant={activePreset?.key === preset.key ? "default" : "outline"}
                className="h-7 rounded-full text-xs"
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
                  "inline-flex h-7 items-center rounded-full border text-xs",
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                )}>
                  <button type="button" className="inline-flex items-center gap-1 pl-2.5 pr-1" onClick={() => setView(s.view)}>
                    <Bookmark className="h-3 w-3" /> {s.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete saved view ${s.name}`}
                    className="pr-2 opacity-60 hover:opacity-100"
                    onClick={() => setSaved((current) => current.filter((v) => v.id !== s.id))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search the records"
                placeholder="Child, class, reason, number…"
                className="h-8 pl-8 text-sm"
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
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => setView((current) => clearFilters(current))}>
                <RotateCcw className="h-3 w-3" /> Clear {filtersOn}
              </Button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={view.groupBy} onValueChange={(groupBy) => patch({ groupBy: groupBy as GroupKey })}>
                <SelectTrigger aria-label="Group by" className="h-8 w-[150px] text-xs">
                  <span className="text-muted-foreground">Group:</span> <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GROUP_LABEL) as GroupKey[]).map((key) => (
                    <SelectItem key={key} value={key}>{GROUP_LABEL[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center">
                <Select value={view.sort} onValueChange={(sort) => patch({ sort: sort as SortKey })}>
                  <SelectTrigger aria-label="Sort by" className="h-8 w-[150px] rounded-r-none text-xs">
                    <span className="text-muted-foreground">Sort:</span> <SelectValue />
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
                  className="h-8 w-8 rounded-l-none border-l-0"
                  aria-label={view.descending ? "Sorted high to low, change" : "Sorted low to high, change"}
                  onClick={() => patch({ descending: !view.descending })}
                >
                  {view.descending ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[280px] space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-medium">Columns</p>
                    <div className="grid grid-cols-2 gap-1">
                      {ALL_COLUMNS.map((column) => {
                        const on = view.columns.includes(column.key);
                        return (
                          <button
                            key={column.key}
                            type="button"
                            aria-pressed={on}
                            className={cn(
                              "flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:bg-muted",
                              on ? "" : "text-muted-foreground",
                            )}
                            onClick={() => {
                              const next = on ? view.columns.filter((c) => c !== column.key) : [...view.columns, column.key];
                              if (next.length > 0) patch({ columns: next });
                            }}
                          >
                            <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-sm border", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                              {on && <Check className="h-2.5 w-2.5" />}
                            </span>
                            {column.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="stars-compact" className="text-xs font-medium">Compact rows</Label>
                    <Switch id="stars-compact" checked={view.density === "compact"} onCheckedChange={(on) => patch({ density: on ? "compact" : "comfortable" })} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="stars-page-size" className="text-xs font-medium">Rows on a page</Label>
                    <Select value={String(view.pageSize)} onValueChange={(size) => patch({ pageSize: Number(size) })}>
                      <SelectTrigger id="stars-page-size" className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[25, 50, 100, 200].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="stars-before-start" className="text-xs font-medium">
                      Records before the start date{beforeStartCount !== null ? ` (${beforeStartCount.toLocaleString()})` : ""}
                    </Label>
                    <Switch id="stars-before-start" checked={includeBeforeStart} onCheckedChange={onIncludeBeforeStart} />
                  </div>
                  <div className="space-y-1.5 border-t pt-3">
                    <Label htmlFor="stars-save-name" className="text-xs font-medium">Save this view</Label>
                    <div className="flex gap-1.5">
                      <Input
                        id="stars-save-name"
                        className="h-8 text-xs"
                        placeholder="Name it"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveCurrent(); }}
                      />
                      <Button size="sm" className="h-8 text-xs" disabled={!saveName.trim()} onClick={saveCurrent}>Save</Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Filters, grouping, sorting and columns. Kept in this browser.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------- the rows */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              {loading
                ? "Loading the records…"
                : <>
                    <strong className="font-semibold text-foreground">{sorted.length.toLocaleString()}</strong>
                    {" "}of {records.length.toLocaleString()} record{records.length === 1 ? "" : "s"}
                    {deferred.groupBy !== "none" && `, in ${groups.length} group${groups.length === 1 ? "" : "s"}`}
                  </>}
            </p>
            <div className="flex items-center gap-2">
              {loadedAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {dayjs(loadedAt).tz().format("HH:mm")}</span>}
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onRefresh} disabled={fetching}>
                {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh
              </Button>
            </div>
          </div>

          {truncated && (
            <p className="rounded-md border border-warning/50 bg-warning/5 p-2 text-xs">
              This is the newest 20,000 records. Older ones are in the log but not loaded here.
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nothing yet. Pixel Pal has not been read.</p>
          ) : sorted.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
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
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Page {safePage + 1} of {pages}</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Next</Button>
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
