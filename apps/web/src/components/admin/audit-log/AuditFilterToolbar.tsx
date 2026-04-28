import { useNavigate } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { Route as AuditRoute } from '@/routes/_authenticated/admin/audit-log';
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
import { useAuditCsvExport } from '@/hooks/useAuditCsvExport';
import type {
  AuditAction,
  AuditCategory,
  AuditFilters,
} from '@/hooks/useAuditEntries';

/**
 * Phase 15-09 component: URL-synced filter controls for `/admin/audit-log`.
 *
 * Reads/writes 7 search-params (`startDate`, `endDate`, `action`,
 * `resource`, `userId`, `category`, `page`) via `Route.useSearch()` +
 * `navigate({ search })` (carry-forward of D-26: Phase 14 pattern).
 *
 * Field labels verbatim per UI-SPEC § Filter toolbar field labels:
 *   `Von`, `Bis`, `Aktion`, `Ressource`, `Benutzer`, `Kategorie`.
 *
 * Action filter is single-select for v1; multi-select via Popover+Command
 * is deferred (truth-list note + plan SUMMARY § Deferred Items).
 *
 * The `Benutzer` field maps to the backend's `userId` filter — admin
 * pastes a UUID for v1. A Person-picker (resolves email/name → UUID) is
 * deferred. Placeholder copy "Name oder Email" matches the eventual UX.
 *
 * CSV export button calls `useAuditCsvExport().download(filters)` which
 * triggers a real browser download (plan 15-02 server-side endpoint).
 *
 * Reset button clears all 7 fields (page also resets to 1).
 */

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'create', label: 'Erstellen' },
  { value: 'update', label: 'Aktualisieren' },
  { value: 'delete', label: 'Löschen' },
  { value: 'read', label: 'Lesen' },
];

const CATEGORY_OPTIONS: { value: AuditCategory; label: string }[] = [
  { value: 'MUTATION', label: 'Mutation' },
  { value: 'SENSITIVE_READ', label: 'Sensitive Lesung' },
];

const ALL_SENTINEL = '__all__';

export function AuditFilterToolbar() {
  const navigate = useNavigate();
  const search = AuditRoute.useSearch();
  const csv = useAuditCsvExport();

  const update = (
    patch: Partial<{
      startDate: string | undefined;
      endDate: string | undefined;
      action: AuditAction | undefined;
      resource: string | undefined;
      userId: string | undefined;
      category: AuditCategory | undefined;
    }>,
  ) => {
    navigate({
      to: '/admin/audit-log',
      search: (prev) => ({ ...prev, ...patch, page: 1 }),
    });
  };

  const reset = () =>
    navigate({
      to: '/admin/audit-log',
      search: () => ({ page: 1 }),
    });

  const filtersForExport: AuditFilters = {
    startDate: search.startDate,
    endDate: search.endDate,
    action: search.action,
    resource: search.resource,
    userId: search.userId,
    category: search.category,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid w-40 gap-1">
          <Label className="text-muted-foreground">Von</Label>
          <Input
            type="date"
            value={search.startDate ?? ''}
            onChange={(e) =>
              update({ startDate: e.target.value || undefined })
            }
          />
        </div>

        <div className="grid w-40 gap-1">
          <Label className="text-muted-foreground">Bis</Label>
          <Input
            type="date"
            value={search.endDate ?? ''}
            onChange={(e) =>
              update({ endDate: e.target.value || undefined })
            }
          />
        </div>

        <div className="grid w-44 gap-1">
          <Label className="text-muted-foreground">Aktion</Label>
          <Select
            value={search.action ?? ALL_SENTINEL}
            onValueChange={(v) =>
              update({
                action:
                  v === ALL_SENTINEL ? undefined : (v as AuditAction),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Aktionen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SENTINEL}>Alle Aktionen</SelectItem>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid w-44 gap-1">
          <Label className="text-muted-foreground">Ressource</Label>
          <Input
            type="search"
            placeholder="z.B. consent, school"
            value={search.resource ?? ''}
            onChange={(e) =>
              update({ resource: e.target.value || undefined })
            }
          />
        </div>

        <div className="grid w-56 gap-1">
          <Label className="text-muted-foreground">Benutzer</Label>
          <Input
            type="search"
            placeholder="Name oder Email"
            value={search.userId ?? ''}
            onChange={(e) =>
              update({ userId: e.target.value || undefined })
            }
          />
        </div>

        <div className="grid w-44 gap-1">
          <Label className="text-muted-foreground">Kategorie</Label>
          <Select
            value={search.category ?? ALL_SENTINEL}
            onValueChange={(v) =>
              update({
                category:
                  v === ALL_SENTINEL
                    ? undefined
                    : (v as AuditCategory),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Kategorien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SENTINEL}>Alle Kategorien</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset}>
          Filter zurücksetzen
        </Button>
        <Button
          onClick={() => csv.download(filtersForExport)}
          disabled={csv.isPending}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV exportieren
        </Button>
      </div>
    </div>
  );
}
