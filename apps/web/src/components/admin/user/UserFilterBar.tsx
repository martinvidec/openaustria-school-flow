import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRoles } from '@/features/users/hooks/use-roles';
import type {
  EnabledFilter,
  LinkedFilter,
  UserDirectoryQuery,
} from '@/features/users/types';

/**
 * Phase 13-02 — UserFilterBar.
 *
 * UI-SPEC §Layout §`/admin/users`:
 *   - Search (debounced 300ms, `Name oder E-Mail …` placeholder)
 *   - Rolle multi-select (5 roles + 'Ohne Rolle' pseudo-option)
 *   - Linked toggle (Alle / Verknüpft / Nicht verknüpft)
 *   - Enabled toggle (Alle / Aktiv / Deaktiviert)
 *   - 'Filter zurücksetzen' visible when ANY non-default filter is set
 *
 * Mobile <640px: 4 controls collapse behind a `SlidersHorizontal` button
 * that opens a bottom-sheet Dialog containing the same controls. All
 * interactive elements are 44px+ on mobile.
 */

interface Props {
  filter: UserDirectoryQuery;
  onChange: (next: UserDirectoryQuery) => void;
}

export function UserFilterBar({ filter, onChange }: Props) {
  const [searchInput, setSearchInput] = useState(filter.search ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Debounce search by 300ms — Phase 11/12 convention.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchInput || '') !== (filter.search ?? '')) {
        onChange({ ...filter, search: searchInput || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const isFiltered =
    !!filter.search ||
    (filter.role && filter.role.length > 0) ||
    (filter.linked && filter.linked !== 'all') ||
    (filter.enabled && filter.enabled !== 'all');

  const reset = () => {
    setSearchInput('');
    onChange({ page: 1, limit: filter.limit ?? 25, linked: 'all', enabled: 'all' });
  };

  return (
    <div className="space-y-3">
      {/* Desktop / tablet — 4 controls */}
      <div className="hidden sm:flex flex-wrap items-center gap-3">
        <SearchBox value={searchInput} onChange={setSearchInput} />
        <RolleMultiSelect
          value={filter.role ?? []}
          onChange={(role) => onChange({ ...filter, role, page: 1 })}
        />
        <LinkedToggle
          value={filter.linked ?? 'all'}
          onChange={(linked) => onChange({ ...filter, linked, page: 1 })}
        />
        <EnabledToggle
          value={filter.enabled ?? 'all'}
          onChange={(enabled) => onChange({ ...filter, enabled, page: 1 })}
        />
        {isFiltered && (
          <Button variant="ghost" onClick={reset} className="ml-auto">
            <X className="h-4 w-4 mr-2" aria-hidden /> Filter zurücksetzen
          </Button>
        )}
      </div>

      {/* Mobile — single button opens dialog */}
      <div className="sm:hidden flex items-center gap-2">
        <SearchBox value={searchInput} onChange={setSearchInput} />
        <Button
          variant="outline"
          onClick={() => setMobileOpen(true)}
          className="min-h-11 min-w-11"
          aria-label="Filter öffnen"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <RolleMultiSelect
              value={filter.role ?? []}
              onChange={(role) => onChange({ ...filter, role, page: 1 })}
            />
            <LinkedToggle
              value={filter.linked ?? 'all'}
              onChange={(linked) => onChange({ ...filter, linked, page: 1 })}
            />
            <EnabledToggle
              value={filter.enabled ?? 'all'}
              onChange={(enabled) => onChange({ ...filter, enabled, page: 1 })}
            />
            {isFiltered && (
              <Button variant="ghost" onClick={reset} className="min-h-11">
                <X className="h-4 w-4 mr-2" aria-hidden /> Filter zurücksetzen
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[12rem]">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name oder E-Mail …"
        className="pl-9 min-h-11 sm:min-h-9"
        aria-label="Nach Name oder E-Mail suchen"
      />
    </div>
  );
}

function RolleMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { data: roles } = useRoles();
  const items = useMemo(() => {
    const list = (roles ?? []).map((r) => ({ name: r.name, label: r.displayName ?? r.name }));
    list.push({ name: '__none__', label: 'Ohne Rolle' });
    return list;
  }, [roles]);
  const [open, setOpen] = useState(false);
  const selectedLabel =
    value.length === 0
      ? 'Alle Rollen'
      : value.length === 1
        ? items.find((i) => i.name === value[0])?.label ?? value[0]
        : `${value.length} Rollen`;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        className="min-h-11 sm:min-h-9 w-full sm:w-44 justify-between"
      >
        <span className="truncate">{selectedLabel}</span>
      </Button>
      {open && (
        <div
          className="absolute z-30 mt-1 w-56 rounded-md border bg-popover p-2 shadow"
          role="listbox"
          aria-label="Rollen filtern"
        >
          {items.map((it) => {
            const checked = value.includes(it.name);
            return (
              <label
                key={it.name}
                className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent min-h-11 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    const next = c ? [...value, it.name] : value.filter((v) => v !== it.name);
                    onChange(next);
                  }}
                />
                <span className="text-sm">{it.label}</span>
              </label>
            );
          })}
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Schließen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedToggle({
  value,
  onChange,
}: {
  value: LinkedFilter;
  onChange: (v: LinkedFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Verknüpfungsstatus">
      <Label className="text-sm text-muted-foreground sr-only sm:not-sr-only">Verknüpft</Label>
      {(['all', 'linked', 'unlinked'] as const).map((opt) => (
        <Button
          key={opt}
          variant={value === opt ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(opt)}
          className="min-h-11 sm:min-h-9"
        >
          {opt === 'all' ? 'Alle' : opt === 'linked' ? 'Verknüpft' : 'Nicht verknüpft'}
        </Button>
      ))}
    </div>
  );
}

function EnabledToggle({
  value,
  onChange,
}: {
  value: EnabledFilter;
  onChange: (v: EnabledFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Status">
      <Label className="text-sm text-muted-foreground sr-only sm:not-sr-only">Status</Label>
      {(['all', 'active', 'disabled'] as const).map((opt) => (
        <Button
          key={opt}
          variant={value === opt ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(opt)}
          className="min-h-11 sm:min-h-9"
        >
          {opt === 'all' ? 'Alle' : opt === 'active' ? 'Aktiv' : 'Deaktiviert'}
        </Button>
      ))}
    </div>
  );
}
