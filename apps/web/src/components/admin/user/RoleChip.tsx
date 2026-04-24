import { Shield, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Phase 13-02 — small role-chip used in user-list, RolesTab, and the
 * SourceChip in EffectivePermissionsTab. Color/icon triad locked by
 * UI-SPEC §Color §Access-signal pairings.
 *
 * - admin         → success-green tint  + ShieldCheck
 * - schulleitung  → warning-amber tint  + Shield
 * - all others    → neutral             + Users
 */

interface Props {
  roleName: string;
  displayName?: string;
  className?: string;
}

const ROLE_DISPLAY: Record<string, string> = {
  admin: 'Admin',
  schulleitung: 'Schulleitung',
  lehrer: 'Lehrer',
  eltern: 'Eltern',
  schueler: 'Schüler',
};

export function RoleChip({ roleName, displayName, className }: Props) {
  const label = displayName ?? ROLE_DISPLAY[roleName] ?? roleName;
  let variant: string;
  let Icon: typeof ShieldCheck;
  if (roleName === 'admin') {
    variant = 'bg-success/10 text-success border-success/40';
    Icon = ShieldCheck;
  } else if (roleName === 'schulleitung') {
    variant = 'bg-warning/10 text-warning border-warning/40';
    Icon = Shield;
  } else {
    variant = 'bg-secondary text-secondary-foreground border-border';
    Icon = Users;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        variant,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
