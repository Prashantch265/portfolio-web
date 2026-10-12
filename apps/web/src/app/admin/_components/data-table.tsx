"use client";

import { useMemo, useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /** Only meaningful if the column is sortable — the raw value to compare. Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  filterFn?: (row: T, query: string) => boolean;
  filterPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyMessage: string;
}

type SortDir = "ascending" | "descending" | "none";

/**
 * PRD §6's DataTable — sortable by header click, client-side filter
 * (every admin list endpoint is unpaginated at this content volume,
 * PRD §7), row click, Enter-key row activation.
 */
export function DataTable<T>({ columns, rows, rowKey, filterFn, filterPlaceholder, onRowClick, emptyMessage }: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const filtered = useMemo(() => {
    if (!filterFn || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => filterFn(row, q));
  }, [rows, query, filterFn]);

  const sorted = useMemo(() => {
    if (!sortKey || sortDir === "none") return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "ascending" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortValue) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("ascending");
    } else if (sortDir === "ascending") {
      setSortDir("descending");
    } else {
      setSortDir("none");
      setSortKey(null);
    }
  }

  return (
    <>
      {filterFn ? (
        <div className="admin-toolbar-row">
          <input
            className="admin-filter-input"
            type="text"
            placeholder={filterPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={filterPlaceholder}
          />
        </div>
      ) : null}
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col)}
                aria-sort={sortKey === col.key ? sortDir : col.sortValue ? "none" : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td className="data-table__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (onRowClick && e.key === "Enter") onRowClick(row);
                }}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
