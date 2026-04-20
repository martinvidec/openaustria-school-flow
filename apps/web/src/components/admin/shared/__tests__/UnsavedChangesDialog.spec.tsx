import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  it('renders 3 actions with German labels when open=true', () => {
    render(
      <UnsavedChangesDialog
        open
        onDiscard={vi.fn()}
        onCancel={vi.fn()}
        onSaveAndContinue={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Verwerfen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Speichern.*Weiter/ })).toBeInTheDocument();
  });

  it('clicking "Verwerfen" calls onDiscard', async () => {
    const onDiscard = vi.fn();
    render(
      <UnsavedChangesDialog
        open
        onDiscard={onDiscard}
        onCancel={vi.fn()}
        onSaveAndContinue={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('clicking "Abbrechen" calls onCancel', async () => {
    const onCancel = vi.fn();
    render(
      <UnsavedChangesDialog
        open
        onDiscard={vi.fn()}
        onCancel={onCancel}
        onSaveAndContinue={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking "Speichern & Weiter" calls onSaveAndContinue', async () => {
    const onSaveAndContinue = vi.fn();
    render(
      <UnsavedChangesDialog
        open
        onDiscard={vi.fn()}
        onCancel={vi.fn()}
        onSaveAndContinue={onSaveAndContinue}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Speichern.*Weiter/ }));
    expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
  });

  it('isSaving disables all three buttons and shows "Wird gespeichert..." on primary', () => {
    render(
      <UnsavedChangesDialog
        open
        isSaving
        onDiscard={vi.fn()}
        onCancel={vi.fn()}
        onSaveAndContinue={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Verwerfen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Wird gespeichert/ })).toBeDisabled();
  });
});
