import { useNavigate } from '@tanstack/react-router';
import { Route as DsgvoRoute } from '@/routes/_authenticated/admin/dsgvo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProcessingPurpose, ConsentStatus } from '@/hooks/useConsents';

/**
 * Phase 15-06 Task 1: Filter toolbar for ConsentsTab.
 *
 * Three URL-synced controlled inputs:
 *  - <Select> Zweck   (placeholder "Alle Zwecke")
 *  - <Select> Status  (placeholder "Alle Stati")
 *  - <Input>  Person  (placeholder "Name oder Email")
 *
 * State lives in the URL via Route.useSearch() — never mirrored into
 * local useState (URL is the source of truth). Filter changes call
 * navigate({ to: '/admin/dsgvo', search: prev => ({ ...prev, tab:
 * 'consents', ...patch, page: 1 }) }) so deep-link + back-button +
 * copy-paste round-trip cleanly. Page resets to 1 on every filter change
 * to avoid stranding the user on an empty page.
 *
 * Labels use text-muted-foreground per UI-SPEC § Typography Label rule
 * (label vs body separation via color, not weight).
 *
 * NO debounce on the search input — TanStack Query's staleTime + the
 * network round-trip naturally throttles, and admin-scale typing is
 * <100 keystrokes/min (T-15-06-05 accept).
 */

const PURPOSE_OPTIONS: { value: ProcessingPurpose; label: string }[] = [
  // Real backend Prisma `ProcessingPurpose` values (verified 2026-04-27
  // against schema.prisma + dto/create-consent.dto.ts). German labels
  // chosen for the admin audience.
  { value: 'STUNDENPLANERSTELLUNG', label: 'Stundenplanerstellung' },
  { value: 'KOMMUNIKATION', label: 'Kommunikation' },
  { value: 'NOTENVERARBEITUNG', label: 'Notenverarbeitung' },
  { value: 'FOTOFREIGABE', label: 'Fotofreigabe' },
  { value: 'KONTAKTDATEN_WEITERGABE', label: 'Kontaktdaten-Weitergabe' },
  { value: 'LERNPLATTFORM', label: 'Lernplattform' },
  { value: 'STATISTIK', label: 'Statistik' },
];

const STATUS_OPTIONS: { value: ConsentStatus; label: string }[] = [
  { value: 'granted', label: 'Erteilt' },
  { value: 'withdrawn', label: 'Widerrufen' },
  { value: 'expired', label: 'Abgelaufen' },
];

export function ConsentsFilterToolbar() {
  const navigate = useNavigate();
  const search = DsgvoRoute.useSearch();

  const update = (
    patch: Partial<{
      purpose: ProcessingPurpose | undefined;
      status: ConsentStatus | undefined;
      q: string | undefined;
    }>,
  ) => {
    navigate({
      to: '/admin/dsgvo',
      search: (prev) => ({ ...prev, tab: 'consents', ...patch, page: 1 }),
    });
  };

  const reset = () =>
    navigate({
      to: '/admin/dsgvo',
      search: (prev) => ({
        ...prev,
        tab: 'consents',
        purpose: undefined,
        status: undefined,
        q: undefined,
        page: 1,
      }),
    });

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid w-48 gap-1">
        <Label className="text-muted-foreground">Zweck</Label>
        <Select
          value={search.purpose ?? '__all__'}
          onValueChange={(v) =>
            update({
              purpose:
                v === '__all__' ? undefined : (v as ProcessingPurpose),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Alle Zwecke" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Zwecke</SelectItem>
            {PURPOSE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid w-40 gap-1">
        <Label className="text-muted-foreground">Status</Label>
        <Select
          value={search.status ?? '__all__'}
          onValueChange={(v) =>
            update({
              status: v === '__all__' ? undefined : (v as ConsentStatus),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Alle Stati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Stati</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grow min-w-[16rem] gap-1">
        <Label className="text-muted-foreground">Person</Label>
        <Input
          type="search"
          placeholder="Name oder Email"
          defaultValue={search.q ?? ''}
          onChange={(e) => update({ q: e.target.value || undefined })}
        />
      </div>

      <Button variant="outline" onClick={reset}>
        Filter zurücksetzen
      </Button>
    </div>
  );
}
