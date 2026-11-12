import * as React from "react";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

// Ivory table recipe (DESIGN_SYSTEM s.15): a list container with hairlines, no zebra,
// uppercase caption-size headers. Numeric cells add `text-right tabular-nums whitespace-nowrap` themselves.
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <div
        className={
          ivory
            ? "relative w-full overflow-auto rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1"
            : "glass relative w-full overflow-auto rounded-xl"
        }
      >
        <table
          ref={ref}
          className={cn(ivory ? "w-full caption-bottom text-hec-small text-hec-ink" : "w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return <thead ref={ref} className={cn(ivory ? "[&_tr]:border-b [&_tr]:border-hec-line" : "[&_tr]:border-b", className)} {...props} />;
  },
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <tfoot
        ref={ref}
        className={cn(
          ivory
            ? // The money-total rule: the one 2 px ink line in the system (DESIGN_SYSTEM s.14).
              "border-t-2 border-hec-ink font-semibold [&>tr]:last:border-b-0"
            : "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
          className,
        )}
        {...props}
      />
    );
  },
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <tr
        ref={ref}
        className={cn(
          ivory
            ? "border-b border-hec-line transition-colors duration-hec-1 ease-hec data-[state=selected]:bg-hec-sunken hover:bg-hec-sunken/60"
            : "border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",
          className,
        )}
        {...props}
      />
    );
  },
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <th
        ref={ref}
        className={cn(
          ivory
            ? "h-11 px-4 py-3 text-left align-middle text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft [&:has([role=checkbox])]:pr-0"
            : "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
          className,
        )}
        {...props}
      />
    );
  },
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <td
        ref={ref}
        className={cn(ivory ? "px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0" : "p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props}
      />
    );
  },
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <caption
        ref={ref}
        className={cn(ivory ? "mt-4 text-hec-small text-hec-ink-soft" : "mt-4 text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  },
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
