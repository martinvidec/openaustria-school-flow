/* @vitest-environment jsdom */
// Phase 16 Plan 02 Task 3 — ChecklistItem unit tests (TDD RED).
// Locks the locked anatomy + status badge color map per UI-SPEC and the
// data-* E2E selectors per D-21 carry-forward.

import { render, screen } from '@testing-library/react';
import { Building2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { ChecklistItem } from './ChecklistItem';

describe('ChecklistItem (Phase 16 Plan 02 Task 3)', () => {
  it('Test 1: renders title + secondary + status badge', () => {
    render(
      <ChecklistItem
        icon={Building2}
        title="Schule"
        status="done"
        secondary="Volksschule Wien-Mitte"
        to="/admin/school/settings"
        testId="school"
      />,
    );
    expect(screen.getByText('Schule')).toBeInTheDocument();
    expect(screen.getByText('Volksschule Wien-Mitte')).toBeInTheDocument();
    // Desktop badge label visible.
    expect(screen.getByText('Erledigt')).toBeInTheDocument();
  });

  it('Test 2: status="done" renders badge with bg-success/15 text-success classes AND Erledigt label', () => {
    const { container } = render(
      <ChecklistItem
        icon={Building2}
        title="Schule"
        status="done"
        secondary=""
        to="/admin/school/settings"
        testId="school"
      />,
    );
    const badge = container.querySelector('.bg-success\\/15.text-success');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('Erledigt');
  });

  it('Test 3: status="partial" renders bg-warning/15 text-warning AND Unvollständig', () => {
    const { container } = render(
      <ChecklistItem
        icon={Building2}
        title="Lehrer"
        status="partial"
        secondary=""
        to="/admin/teachers"
        testId="teachers"
      />,
    );
    const badge = container.querySelector('.bg-warning\\/15.text-warning');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('Unvollständig');
  });

  it('Test 4: status="missing" renders bg-destructive/15 text-destructive AND Fehlt', () => {
    const { container } = render(
      <ChecklistItem
        icon={Building2}
        title="Klassen"
        status="missing"
        secondary=""
        to="/admin/classes"
        testId="classes"
      />,
    );
    const badge = container.querySelector(
      '.bg-destructive\\/15.text-destructive',
    );
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('Fehlt');
  });

  it('Test 5: outer element is a link with href={props.to}', () => {
    render(
      <ChecklistItem
        icon={Building2}
        title="Audit-Log"
        status="done"
        secondary=""
        to="/admin/audit-log"
        testId="audit"
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/admin/audit-log');
  });

  it('Test 6: outer element carries data-checklist-item={testId} AND data-checklist-status={status}', () => {
    render(
      <ChecklistItem
        icon={Building2}
        title="Schule"
        status="partial"
        secondary=""
        to="/admin/school/settings"
        testId="school"
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('data-checklist-item')).toBe('school');
    expect(link.getAttribute('data-checklist-status')).toBe('partial');
  });

  it('Test 7: row has min-h-14 class', () => {
    render(
      <ChecklistItem
        icon={Building2}
        title="Schule"
        status="done"
        secondary=""
        to="/admin/school/settings"
        testId="school"
      />,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('min-h-14');
  });
});
