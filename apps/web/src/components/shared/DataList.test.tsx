/* @vitest-environment jsdom */
// Phase 16 Plan 02 Task 2 — DataList dual-mode rendering tests (TDD RED).
// Locks the contract for D-12 (mobile-card render-prop), D-14 (data-testid
// on both render paths), and the sm breakpoint switch (RESEARCH § Pattern 4).

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataList, type DataListColumn } from './DataList';

interface Row {
  id: string;
  name: string;
  age: number;
}

const ROWS: Row[] = [
  { id: 'r1', name: 'Alice', age: 30 },
  { id: 'r2', name: 'Bob', age: 42 },
];

const COLUMNS: DataListColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (r) => r.name },
  { key: 'age', header: 'Alter', cell: (r) => r.age },
];

function MobileCard({ row }: { row: Row }) {
  return (
    <div data-testid={`mobile-card-${row.id}`}>
      <strong>{row.name}</strong>
      <span>{row.age}</span>
    </div>
  );
}

describe('DataList (Phase 16 Plan 02 Task 2)', () => {
  it('Test 1: renders <table> when mode="desktop" and rows non-empty', () => {
    render(
      <DataList
        mode="desktop"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Test 2: renders mobile-card stack (no <table>) when mode="mobile"', () => {
    render(
      <DataList
        mode="mobile"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-card-r1')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-card-r2')).toBeInTheDocument();
  });

  it('Test 3: mode="auto" renders BOTH containers (Tailwind controls visibility)', () => {
    const { container } = render(
      <DataList
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    // Desktop wrapper
    expect(container.querySelector('.hidden.sm\\:block')).toBeInTheDocument();
    // Mobile wrapper
    expect(container.querySelector('.sm\\:hidden')).toBeInTheDocument();
    // Both contain the rows
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-card-r1')).toBeInTheDocument();
  });

  it('Test 4: renders emptyState slot when rows empty + not loading', () => {
    render(
      <DataList
        rows={[]}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        mobileCard={(r) => <MobileCard row={r} />}
        emptyState={<div data-testid="empty">Nothing here</div>}
      />,
    );
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('Test 5: loading=true with no loadingSlot renders 5 animate-pulse skeleton rows', () => {
    const { container } = render(
      <DataList
        rows={[]}
        loading={true}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('Test 6: each row carries data-testid={getRowTestId(row)} on desktop tr', () => {
    render(
      <DataList
        mode="desktop"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        getRowTestId={(r) => `row-${r.id}`}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    const row1 = screen.getByTestId('row-r1');
    expect(row1.tagName).toBe('TR');
    expect(within(row1).getByText('Alice')).toBeInTheDocument();
  });

  it('Test 7: column headers render with text-xs uppercase tracking-wide text-muted-foreground', () => {
    render(
      <DataList
        mode="desktop"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    const header = screen.getByText('Name');
    expect(header.className).toContain('text-xs');
    expect(header.className).toContain('uppercase');
    expect(header.className).toContain('tracking-wide');
    expect(header.className).toContain('text-muted-foreground');
  });

  it('Test 8: clicking a row invokes onRowClick with the row data', () => {
    const onRowClick = vi.fn();
    render(
      <DataList
        mode="desktop"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        getRowTestId={(r) => `row-${r.id}`}
        mobileCard={(r) => <MobileCard row={r} />}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByTestId('row-r1'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  // Phase 16 Plan 05 — getRowAttrs supports preserving existing E2E
  // selectors (`data-audit-id`, `data-template-type`, ...) on both render
  // paths during the migration of Phase 14/15 admin tables.
  it('Test 9: getRowAttrs spreads arbitrary data-* attrs on desktop <tr>', () => {
    render(
      <DataList
        mode="desktop"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        getRowTestId={(r) => `row-${r.id}`}
        getRowAttrs={(r) => ({
          'data-audit-id': r.id,
          'data-audit-action': 'create',
        })}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    const tr = screen.getByTestId('row-r1');
    expect(tr.getAttribute('data-audit-id')).toBe('r1');
    expect(tr.getAttribute('data-audit-action')).toBe('create');
  });

  it('Test 10: getRowAttrs also lands on the mobile-card wrapper', () => {
    const { container } = render(
      <DataList
        mode="mobile"
        rows={ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        getRowTestId={(r) => `mob-${r.id}`}
        getRowAttrs={(r) => ({ 'data-audit-id': r.id })}
        mobileCard={(r) => <MobileCard row={r} />}
      />,
    );
    const wrapper = container.querySelector('[data-testid="mob-r1"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-audit-id')).toBe('r1');
  });
});
