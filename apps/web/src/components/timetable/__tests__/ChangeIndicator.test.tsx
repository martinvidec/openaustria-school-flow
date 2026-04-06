import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChangeIndicator } from '../ChangeIndicator';

/**
 * ChangeIndicator is a pure styling wrapper after the UAT refactor:
 * - Applies border color + background per changeType
 * - Renders "Entfall" badge for cancelled
 * - Passes children through unchanged
 *
 * Text rendering (teacher names, "Stillarbeit" label) now lives in
 * TimetableCell which builds the inline content before wrapping.
 */
describe('ChangeIndicator styling wrapper (SUBST-05)', () => {
  it('applies orange border+bg for changeType="substitution"', () => {
    const { container } = render(
      <ChangeIndicator changeType="substitution">
        <div>content</div>
      </ChangeIndicator>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/border-l-4/);
    expect(root.className).toMatch(/25[, ]+95%/);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies red border+bg and renders "Entfall" badge for changeType="cancelled"', () => {
    const { container } = render(
      <ChangeIndicator changeType="cancelled">
        <div>content</div>
      </ChangeIndicator>,
    );
    expect(screen.getByText('Entfall')).toBeInTheDocument();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/border-l-4/);
    expect(root.className).toMatch(/0[, ]+84%/);
  });

  it('applies blue border+bg for changeType="room-swap"', () => {
    const { container } = render(
      <ChangeIndicator changeType="room-swap">
        <div>content</div>
      </ChangeIndicator>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/border-l-4/);
    expect(root.className).toMatch(/221[, ]+83%/);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies orange border+bg for changeType="stillarbeit"', () => {
    const { container } = render(
      <ChangeIndicator changeType="stillarbeit">
        <div>content</div>
      </ChangeIndicator>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/border-l-4/);
    expect(root.className).toMatch(/25[, ]+95%/);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders children without wrapper when changeType is null', () => {
    const { container } = render(
      <ChangeIndicator changeType={null}>
        <div>bare content</div>
      </ChangeIndicator>,
    );
    expect(screen.getByText('bare content')).toBeInTheDocument();
    // No border wrapper — children rendered directly
    expect(container.querySelector('.border-l-4')).toBeNull();
  });
});
