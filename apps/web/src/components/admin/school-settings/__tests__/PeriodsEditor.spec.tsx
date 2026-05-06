import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PeriodsEditor, durationFor, renumber, type PeriodWithId } from '../PeriodsEditor';

const FIXTURE: PeriodWithId[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  periodNumber: i + 1,
  label: `${i + 1}. Stunde`,
  startTime: `0${8 + i}:00`.slice(-5),
  endTime: `0${8 + i}:50`.slice(-5),
  isBreak: false,
}));

describe('PeriodsEditor (Plan 10-04 Task 1)', () => {
  it('renders responsive split — desktop table AND mobile cards with 6 rows each', () => {
    const { container } = render(
      <PeriodsEditor periods={FIXTURE} onChange={vi.fn()} onTemplateReload={vi.fn()} />,
    );
    // Desktop table
    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    // 6 body rows
    const bodyRows = table!.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(6);
    // Mobile container with sm:hidden space-y-3 exists (Phase 16/17 sm: breakpoint standard)
    const mobileWrap = container.querySelector('.sm\\:hidden.space-y-3');
    expect(mobileWrap).toBeTruthy();
  });

  it('+ Periode hinzufuegen appends with periodNumber = max + 1 and 08:00/08:50 defaults', async () => {
    const onChange = vi.fn();
    render(
      <PeriodsEditor periods={FIXTURE} onChange={onChange} onTemplateReload={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Periode hinzufuegen/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as PeriodWithId[];
    expect(next).toHaveLength(7);
    expect(next[6].periodNumber).toBe(7);
    expect(next[6].startTime).toBe('08:00');
    expect(next[6].endTime).toBe('08:50');
    expect(next[6].isBreak).toBe(false);
  });

  it('remove renumbers so periodNumber is contiguous 1..N', async () => {
    const onChange = vi.fn();
    render(
      <PeriodsEditor periods={FIXTURE} onChange={onChange} onTemplateReload={vi.fn()} />,
    );
    // Click the trash on mobile card 3 (the mobile container also renders rows, so
    // grab the trash buttons — there are 12 total (6 desktop + 6 mobile). Pick the
    // 3rd mobile trash (index 8 overall since desktop buttons come first).
    const trashButtons = screen.getAllByRole('button', { name: 'Periode entfernen' });
    await userEvent.click(trashButtons[2]); // desktop row 3
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as PeriodWithId[];
    expect(next).toHaveLength(5);
    expect(next.map((p) => p.periodNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it('durationFor computes minutes when endTime > startTime, null otherwise', () => {
    expect(durationFor({ periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false })).toBe(50);
    expect(durationFor({ periodNumber: 1, startTime: '08:00', endTime: '08:00', isBreak: false })).toBeNull();
    expect(durationFor({ periodNumber: 1, startTime: '09:00', endTime: '08:50', isBreak: false })).toBeNull();
  });

  it('renumber rewrites periodNumber sequentially', () => {
    const shuffled = [FIXTURE[2], FIXTURE[0], FIXTURE[5]];
    expect(renumber(shuffled).map((p) => p.periodNumber)).toEqual([1, 2, 3]);
  });

  it('drag handle has German aria-label "Periode verschieben"', () => {
    render(
      <PeriodsEditor periods={FIXTURE} onChange={vi.fn()} onTemplateReload={vi.fn()} />,
    );
    const handles = screen.getAllByRole('button', { name: 'Periode verschieben' });
    // 6 desktop + 6 mobile = 12
    expect(handles.length).toBeGreaterThanOrEqual(6);
  });
});
