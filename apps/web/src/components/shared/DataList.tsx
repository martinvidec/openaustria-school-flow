import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Phase 16 Plan 02 (D-12 + D-14) — shared dual-mode list primitive.
 *
 * The component renders both a desktop `<table>` and a mobile-card stack and
 * lets Tailwind toggle visibility via `hidden sm:block` / `sm:hidden`. We do
 * NOT switch on a JS-side mobile-detection hook here — that pattern is fine
 * for one-shot decisions (toast position) but would re-mount the entire list
 * on every breakpoint crossing, which is bad for focus and scroll position.
 * Tailwind classes own the layout switch.
 *
 * Breakpoint: 640px (Tailwind `sm`) per RESEARCH § Pattern 4. Existing
 * surfaces use `md:` (768px) — DataList moves the mobile-card threshold up to
 * the device-wide breakpoint so iPhone-Plus / mid-range Android phones still
 * get cards, not a horizontally-scrolling table.
 *
 * `data-testid` is applied on BOTH render paths (desktop `<tr>` and mobile
 * card wrapper) so E2E selectors don't have to know which layout the viewport
 * picked.
 */
export interface DataListColumn<T> {
  /** Stable React key for the column. */
  key: string;
  /** Header text shown on desktop. */
  header: string;
  /** Cell renderer for desktop. */
  cell: (row: T) => ReactNode;
  /** Optional Tailwind classes applied to the `<td>`. */
  className?: string;
  /** Hide this column on `<sm` viewports (rarely used; mobileCard is preferred). */
  hiddenOnMobile?: boolean;
}

export interface DataListProps<T> {
  /** Row data. */
  rows: T[];
  /** Column definitions for the desktop table. */
  columns: DataListColumn<T>[];
  /** Stable identity for React keys. */
  getRowId: (row: T) => string;
  /** Optional `data-testid` factory applied on both render paths. */
  getRowTestId?: (row: T) => string;
  /**
   * Optional factory for arbitrary row-level HTML attributes (Phase 16 Plan 05
   * — required when migrating tables whose existing E2E specs use custom
   * `data-*` selectors like `data-audit-id`, `data-template-type`,
   * `data-dsgvo-job-id` etc.).
   *
   * The returned object is spread onto BOTH the desktop `<tr>` AND the mobile
   * card wrapper so layout-agnostic E2E selectors keep working after migration.
   * Keys MUST be valid HTML attributes (`data-*`, `aria-*`, `id`, ...) — React
   * will warn on invalid props.
   */
  getRowAttrs?: (row: T) => Record<string, string | number | boolean | undefined>;
  /** Mobile card renderer. The wrapper that DataList provides re-applies `data-testid` on the outermost element as a backstop for E2E selectors. */
  mobileCard: (row: T) => ReactNode;
  /**
   * Optional `data-testid` on the OUTER desktop / mobile wrapper `<div>`.
   * Useful for E2E specs that scope locators to a single layout variant
   * before resolving rows (avoids strict-mode dual-match when the same
   * row id appears on both `<tr>` and `<div>` variants in `mode='auto'`).
   */
  desktopWrapperTestId?: string;
  mobileWrapperTestId?: string;
  /** `auto` (default) renders both containers and lets Tailwind decide. `desktop`/`mobile` short-circuit to one branch. */
  mode?: 'desktop' | 'mobile' | 'auto';
  /** Slot rendered when `rows.length === 0 && !loading`. Falls back to a German empty-state line. */
  emptyState?: ReactNode;
  /** When true, renders skeleton rows instead of data. */
  loading?: boolean;
  /** Optional custom loading content (overrides the 5-row skeleton). */
  loadingSlot?: ReactNode;
  /** When provided, rows become clickable and call this with the row data. */
  onRowClick?: (row: T) => void;
}

const SKELETON_ROW_COUNT = 5;

function DesktopTable<T>({
  rows,
  columns,
  getRowId,
  getRowTestId,
  getRowAttrs,
  onRowClick,
}: Pick<
  DataListProps<T>,
  'rows' | 'columns' | 'getRowId' | 'getRowTestId' | 'getRowAttrs' | 'onRowClick'
>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={cn(
                'text-xs uppercase tracking-wide text-muted-foreground text-left px-4 py-2',
                col.hiddenOnMobile && 'hidden sm:table-cell',
              )}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={getRowId(row)}
            data-testid={getRowTestId?.(row)}
            {...(getRowAttrs?.(row) ?? {})}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              'border-t border-border hover:bg-accent',
              onRowClick && 'cursor-pointer',
            )}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={cn(
                  'px-4 py-3',
                  col.className,
                  col.hiddenOnMobile && 'hidden sm:table-cell',
                )}
              >
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MobileStack<T>({
  rows,
  getRowId,
  getRowTestId,
  getRowAttrs,
  mobileCard,
  onRowClick,
}: Pick<
  DataListProps<T>,
  'rows' | 'getRowId' | 'getRowTestId' | 'getRowAttrs' | 'mobileCard' | 'onRowClick'
>) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={getRowId(row)}
          data-testid={getRowTestId?.(row)}
          {...(getRowAttrs?.(row) ?? {})}
          className={cn(
            'rounded-lg border bg-card p-4 min-h-20',
            onRowClick && 'cursor-pointer',
          )}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {mobileCard(row)}
        </div>
      ))}
    </div>
  );
}

function DesktopSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`desk-skel-${i}`}
          className="h-12 bg-muted animate-pulse rounded-md"
        />
      ))}
    </div>
  );
}

function MobileSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`mob-skel-${i}`}
          className="min-h-20 bg-muted animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}

export function DataList<T>({
  rows,
  columns,
  getRowId,
  getRowTestId,
  getRowAttrs,
  mobileCard,
  desktopWrapperTestId,
  mobileWrapperTestId,
  mode = 'auto',
  emptyState,
  loading = false,
  loadingSlot,
  onRowClick,
}: DataListProps<T>) {
  if (loading) {
    if (loadingSlot) {
      return <>{loadingSlot}</>;
    }
    if (mode === 'desktop') {
      return <DesktopSkeleton count={SKELETON_ROW_COUNT} />;
    }
    if (mode === 'mobile') {
      return <MobileSkeleton count={SKELETON_ROW_COUNT} />;
    }
    return (
      <>
        <div className="hidden sm:block">
          <DesktopSkeleton count={SKELETON_ROW_COUNT} />
        </div>
        <div className="sm:hidden">
          <MobileSkeleton count={SKELETON_ROW_COUNT} />
        </div>
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyState ?? <span>Keine Einträge gefunden</span>}
      </div>
    );
  }

  if (mode === 'desktop') {
    return (
      <div className="overflow-x-auto">
        <DesktopTable
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          getRowTestId={getRowTestId}
          getRowAttrs={getRowAttrs}
          onRowClick={onRowClick}
        />
      </div>
    );
  }

  if (mode === 'mobile') {
    return (
      <MobileStack
        rows={rows}
        getRowId={getRowId}
        getRowTestId={getRowTestId}
        getRowAttrs={getRowAttrs}
        mobileCard={mobileCard}
        onRowClick={onRowClick}
      />
    );
  }

  return (
    <>
      <div
        className="hidden sm:block overflow-x-auto"
        data-testid={desktopWrapperTestId}
      >
        <DesktopTable
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          getRowTestId={getRowTestId}
          getRowAttrs={getRowAttrs}
          onRowClick={onRowClick}
        />
      </div>
      <div className="sm:hidden" data-testid={mobileWrapperTestId}>
        <MobileStack
          rows={rows}
          getRowId={getRowId}
          getRowTestId={getRowTestId}
          getRowAttrs={getRowAttrs}
          mobileCard={mobileCard}
          onRowClick={onRowClick}
        />
      </div>
    </>
  );
}
