import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useSubjects } from '@/hooks/useSubjects';

/**
 * Phase 14-02 reuse-style Subject autocomplete (Phase 11 D-08 pattern).
 *
 * Subjects per school are typically small (<200) so we fetch once and
 * filter client-side, matching `displayName` AND `shortName` substring.
 * 300ms debounce, ≥2-char gating per UI-SPEC.
 */
export interface SubjectAutocompleteValue {
  id: string;
  name: string;
  shortName: string;
}

interface Props {
  schoolId: string;
  value: SubjectAutocompleteValue | null;
  onChange: (next: SubjectAutocompleteValue | null) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function SubjectAutocomplete({
  schoolId,
  value,
  onChange,
  placeholder = 'Fach-Name (min. 2 Zeichen) …',
  ariaLabel = 'Fach auswählen',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useSubjects(open ? schoolId : undefined, {
    limit: 200,
  });
  const all = data?.data ?? [];

  const filtered = useMemo(() => {
    if (debounced.length < 2) return [];
    const q = debounced.toLowerCase();
    return all
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [all, debounced]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          aria-expanded={open}
          role="combobox"
          disabled={disabled}
          className="w-full justify-between min-h-11 sm:min-h-9"
        >
          <span className={value ? '' : 'text-muted-foreground'}>
            {value ? `${value.name} (${value.shortName})` : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
          />
          <CommandList>
            {debounced.length < 2 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                <Search className="h-4 w-4 mx-auto mb-2" />
                Mindestens 2 Zeichen eingeben.
              </div>
            ) : isFetching ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Suche läuft …
              </div>
            ) : (
              <>
                <CommandEmpty>
                  Keine Treffer. Prüfen Sie den Namen oder legen Sie das Fach in
                  der Fächerverwaltung an.
                </CommandEmpty>
                {filtered.length > 0 && (
                  <CommandGroup heading="Treffer">
                    {filtered.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.id}
                        onSelect={() => {
                          onChange({
                            id: s.id,
                            name: s.name,
                            shortName: s.shortName,
                          });
                          setOpen(false);
                        }}
                        className="min-h-11"
                      >
                        <span className="truncate">
                          {s.name}{' '}
                          <span className="text-muted-foreground">· {s.shortName}</span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
