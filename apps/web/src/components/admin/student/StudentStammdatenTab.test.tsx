import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentStammdatenTab } from './StudentStammdatenTab';

/**
 * Phase 12-01 Task 3 — StudentStammdatenTab behavioural tests.
 * Mirrors the shape of Phase 11-01 StammdatenTab.test.tsx.
 */
describe('StudentStammdatenTab', () => {
  it('renders Stammdaten form fields in order Vorname/Nachname/Email/Phone/Address/DateOfBirth/SVNR/StudentNumber/Klasse/EnrollmentDate', () => {
    render(<StudentStammdatenTab onSave={vi.fn()} />);
    expect(screen.getByLabelText('Vorname')).toBeTruthy();
    expect(screen.getByLabelText('Nachname')).toBeTruthy();
    expect(screen.getByLabelText('E-Mail')).toBeTruthy();
    expect(screen.getByLabelText('Telefon')).toBeTruthy();
    expect(screen.getByLabelText('Adresse')).toBeTruthy();
    expect(screen.getByLabelText('Geburtsdatum')).toBeTruthy();
    expect(screen.getByLabelText('SVNR')).toBeTruthy();
    expect(screen.getByLabelText('Schüler-Nr.')).toBeTruthy();
    expect(screen.getByLabelText('Stammklasse')).toBeTruthy();
    expect(screen.getByLabelText('Eintrittsdatum')).toBeTruthy();
  });

  it('blocks submit when lastName is empty (Pflichtfeld)', () => {
    const onSave = vi.fn();
    const { container } = render(<StudentStammdatenTab onSave={onSave} />);
    const form = container.querySelector('form')!;
    fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Lisa' } });
    // lastName intentionally empty
    fireEvent.submit(form);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByText('Pflichtfeld').length).toBeGreaterThan(0);
  });

  it('blocks submit when email is invalid', () => {
    const onSave = vi.fn();
    const { container } = render(<StudentStammdatenTab onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Lisa' } });
    fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Huber' } });
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'not-an-email' } });
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Gültige E-Mail-Adresse eingeben')).toBeTruthy();
  });

  it('fires onSave with validated values using englische API-Feldnamen (classId, studentNumber, enrollmentDate)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <StudentStammdatenTab
        onSave={onSave}
        classes={[{ id: 'class-1', name: '1A' }]}
      />,
    );
    fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Lisa' } });
    fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Huber' } });
    fireEvent.change(screen.getByLabelText('Stammklasse'), { target: { value: 'class-1' } });
    fireEvent.change(screen.getByLabelText('Schüler-Nr.'), { target: { value: '2025-0001' } });
    fireEvent.change(screen.getByLabelText('Eintrittsdatum'), { target: { value: '2025-09-01' } });
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalled();
    const payload = onSave.mock.calls[0][0];
    expect(payload.firstName).toBe('Lisa');
    expect(payload.lastName).toBe('Huber');
    expect(payload.classId).toBe('class-1');
    expect(payload.studentNumber).toBe('2025-0001');
    expect(payload.enrollmentDate).toBe('2025-09-01');
  });

  it('calls onDirtyChange(true) when a field is edited', () => {
    const onDirtyChange = vi.fn();
    render(<StudentStammdatenTab onSave={vi.fn()} onDirtyChange={onDirtyChange} />);
    fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Geändert' } });
    expect(onDirtyChange).toHaveBeenCalledWith(true);
  });
});
