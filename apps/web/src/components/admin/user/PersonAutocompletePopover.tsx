import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSchoolContext } from '@/stores/school-context-store';
import { useTeacherSearch } from '@/hooks/useTeacherSearch';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { useParentSearch } from '@/hooks/useParentSearch';
import type { PersonType } from '@/features/users/types';

/**
 * Phase 13-02 — Command-popover-style autocomplete for the
 * `LinkPersonDialog`. Switches the backing search hook based on the
 * selected `personType`. min-length 2 chars + 300ms debounce per Phase
 * 11/12 convention (D-08).
 *
 * The result row shows `firstName lastName` + secondary line (email or
 * className). If the result has `alreadyLinkedToPersonId`, render a
 * red-subtle hint `Bereits verknüpft mit {userEmail}`.
 */

export interface SelectedPerson {
  id: string;
  firstName: string;
  lastName: string;
  secondary?: string;
}

interface Props {
  personType: PersonType;
  onSelect: (person: SelectedPerson) => void;
}

export function PersonAutocompletePopover({ personType, onSelect }: Props) {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? undefined;
  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw), 300);
    return () => clearTimeout(t);
  }, [raw]);

  const isReady = debounced.length >= 2 && !!schoolId;

  const teacher = useTeacherSearch({
    schoolId,
    search: debounced,
    enabled: personType === 'TEACHER' && isReady,
  });
  const student = useStudentSearch({
    schoolId,
    search: debounced,
    enabled: personType === 'STUDENT' && isReady,
  });
  const parent = useParentSearch({
    schoolId,
    search: debounced,
    enabled: personType === 'PARENT' && isReady,
  });

  type Result = {
    id: string;
    firstName: string;
    lastName: string;
    secondary?: string;
    alreadyLinkedUserEmail?: string | null;
  };

  let results: Result[] = [];
  let isLoading = false;
  if (personType === 'TEACHER') {
    isLoading = teacher.isLoading;
    results =
      teacher.data?.map((t) => ({
        id: t.id,
        firstName: t.person.firstName,
        lastName: t.person.lastName,
        secondary: t.person.email ?? undefined,
      })) ?? [];
  } else if (personType === 'STUDENT') {
    isLoading = student.isLoading;
    results =
      student.data?.map((s) => ({
        id: s.id,
        firstName: s.person.firstName,
        lastName: s.person.lastName,
        secondary: s.schoolClass?.name ?? s.person.email ?? undefined,
        alreadyLinkedUserEmail: s.alreadyLinkedUserEmail,
      })) ?? [];
  } else {
    isLoading = parent.isLoading;
    results =
      parent.data?.map((p) => ({
        id: p.id,
        firstName: p.person.firstName,
        lastName: p.person.lastName,
        secondary: p.person.email ?? undefined,
        alreadyLinkedUserEmail: p.alreadyLinkedUserEmail,
      })) ?? [];
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Nachname eingeben (min. 2 Zeichen) …"
          role="combobox"
          aria-controls="person-search-listbox"
          aria-expanded={results.length > 0}
          aria-label="Person suchen"
          className="pl-9 min-h-11 sm:min-h-9"
        />
      </div>

      {debounced.length >= 2 && (
        <div
          id="person-search-listbox"
          role="listbox"
          className="rounded-md border max-h-64 overflow-y-auto"
        >
          {isLoading && (
            <div className="text-sm text-muted-foreground py-2 px-3">Lade …</div>
          )}
          {!isLoading && results.length === 0 && (
            <div className="text-sm text-muted-foreground py-2 px-3">
              Keine Treffer. Prüfen Sie den Namen oder legen Sie die Person in der jeweiligen
              Verwaltung an.
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() =>
                onSelect({
                  id: r.id,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  secondary: r.secondary,
                })
              }
              className="w-full text-left px-3 py-2 hover:bg-accent min-h-11 flex flex-col"
            >
              <span className="font-semibold text-sm">
                {r.firstName} {r.lastName}
              </span>
              {r.secondary && (
                <span className="text-xs text-muted-foreground">{r.secondary}</span>
              )}
              {r.alreadyLinkedUserEmail && (
                <span className="text-xs text-destructive">
                  Bereits verknüpft mit {r.alreadyLinkedUserEmail}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
