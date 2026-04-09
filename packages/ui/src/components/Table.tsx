import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";

// ─── Shell ────────────────────────────────────────────────────

const TableRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-full overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-card",
      className
    )}
    {...props}
  />
));
TableRoot.displayName = "TableRoot";

const TableScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("overflow-x-auto", className)} {...props} />
));
TableScrollArea.displayName = "TableScrollArea";

const TableEl = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full caption-bottom text-sm", className)}
    {...props}
  />
));
TableEl.displayName = "TableEl";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("border-b border-neutral-100 bg-neutral-50/60", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 divide-y divide-neutral-50", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    selected?: boolean;
    clickable?: boolean;
  }
>(({ className, selected, clickable, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-neutral-50 transition-colors",
      selected && "bg-brand-blue/5",
      clickable && "cursor-pointer hover:bg-neutral-50/70",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

type SortDirection = "asc" | "desc" | null;

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean;
    sortDirection?: SortDirection;
    onSort?: () => void;
  }
>(({ className, children, sortable, sortDirection, onSort, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle text-xs font-semibold tracking-wide text-neutral-500 uppercase",
      sortable &&
        "cursor-pointer select-none hover:text-neutral-800 transition-colors",
      className
    )}
    onClick={sortable ? onSort : undefined}
    {...props}
  >
    {sortable ? (
      <span className="inline-flex items-center gap-1">
        {children}
        {sortDirection === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : sortDirection === "desc" ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    ) : (
      children
    )}
  </th>
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3 align-middle text-sm text-neutral-700", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-neutral-500", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// ─── Convenience wrapper ──────────────────────────────────────

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | number;
  emptyMessage?: string;
  className?: string;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
}

function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  selectedRowKey,
  emptyMessage = "데이터가 없습니다.",
  className,
  sortKey,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  return (
    <TableRoot className={className}>
      <TableScrollArea>
        <TableEl>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.headerClassName}
                  sortable={col.sortable}
                  sortDirection={sortKey === col.key ? sortDirection : null}
                  onSort={col.sortable ? () => onSort?.(col.key) : undefined}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-neutral-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const key = getRowKey(row, index);
                return (
                  <TableRow
                    key={key}
                    selected={selectedRowKey === key}
                    clickable={!!onRowClick}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.cell(row, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </TableEl>
      </TableScrollArea>
    </TableRoot>
  );
}

export {
  TableRoot,
  TableScrollArea,
  TableEl,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  DataTable,
};
