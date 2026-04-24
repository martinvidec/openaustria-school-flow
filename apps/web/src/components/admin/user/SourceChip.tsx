import { KeyRound, Shield, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EffectivePermissionRow } from '@/features/users/types';

/**
 * Phase 13-02 — source-attribution chip for the EffectivePermissions table.
 *
 * UI-SPEC §150-153 Access-signal pairings:
 *   - role admin        → success-green tint  + ShieldCheck + 'Rolle: admin'
 *   - role schulleitung → warning-amber tint  + Shield      + 'Rolle: schulleitung'
 *   - role other        → neutral             + Users       + 'Rolle: {name}'
 *   - override          → primary-blue tint   + KeyRound    + 'Override'
 */

interface Props {
  source: EffectivePermissionRow['source'];
  onClick?: () => void;
  className?: string;
}

export function SourceChip({ source, onClick, className }: Props) {
  let variant: string;
  let Icon: typeof ShieldCheck;
  let label: string;
  if (source.kind === 'override') {
    variant = 'bg-primary/10 text-primary border-primary/40';
    Icon = KeyRound;
    label = 'Override';
  } else if (source.roleName === 'admin') {
    variant = 'bg-success/10 text-success border-success/40';
    Icon = ShieldCheck;
    label = `Rolle: ${source.roleName}`;
  } else if (source.roleName === 'schulleitung') {
    variant = 'bg-warning/10 text-warning border-warning/40';
    Icon = Shield;
    label = `Rolle: ${source.roleName}`;
  } else {
    variant = 'bg-secondary text-secondary-foreground border-border';
    Icon = Users;
    label = `Rolle: ${source.roleName}`;
  }

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        variant,
        onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label}>
        {content}
      </button>
    );
  }
  return content;
}
