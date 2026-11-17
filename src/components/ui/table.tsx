import * as React from "react";

import { cn } from "@/lib/utils";

// Ivory table recipe (DESIGN_SYSTEM s.15): a list container with hairlines, no zebra,
// uppercase caption-size headers. Numeric cells add `text-right tabular-nums whitespace-nowrap` themselves.
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className="relative w-full overflow-auto rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1"
      >
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-hec-small text-hec-ink", className)}
          {...props}
        />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-hec-line", className)} {...props} />;
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
    return (
      <tfoot
        ref={ref}
        className={cn(
          "border-t-2 border-hec-ink font-semibold [&>tr]:last:border-b-0",
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
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-hec-line transition-colors duration-hec-1 ease-hec data-[state=selected]:bg-hec-sunken hover:bg-hec-sunken/60",
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
    return (
      <th
        ref={ref}
        className={cn(
          "h-11 px-4 py-3 text-left align-middle text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft [&:has([role=checkbox])]:pr-0",
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
    return (
      <td
        ref={ref}
        className={cn("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props}
      />
    );
  },
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => {
    return (
      <caption
        ref={ref}
        className={cn("mt-4 text-hec-small text-hec-ink-soft", className)}
        {...props}
      />
    );
  },
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
