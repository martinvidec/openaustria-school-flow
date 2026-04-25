import { useEffect, useState } from 'react';
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
import { useClasses } from '@/hooks/useClasses';

/**
 * Phase 14-02 reuse-style Class autocomplete (Phase 12 D-08 pattern).
 *
 * 300ms debounce, ≥2-char gating per UI-SPEC §Class-/Subject-Autocomplete
 * settings. Backed by the existing `useClasses` paginated list endpoint
 * with a `search` filter — same surface used by /admin/classes index.
 */
export interface ClassAutocompleteValue {
  id: string;
  name: string;
  yearLevel: number;
}

interface Props {
  schoolId: string;
  value: ClassAutocompleteValue | null;
  onChange: (next: ClassAutocompleteValue | null) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function ClassAutocomplete({
  schoolId,
  value,
  onChange,
  placeholder = 'Klassen-Name (min. 2 Zeichen) …',
  ariaLabel = 'Klasse auswählen',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useClasses(
    open && debounced.length >= 2 ? schoolId : undefined,
    { search: debounced, limit: 25 },
  );
  const items = data?.data ?? [];

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
            {value ? `${value.name} (${value.yearLevel})` : placeholder}
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
                  Keine Treffer. Prüfen Sie den Namen oder legen Sie die Klasse
                  in der Klassenverwaltung an.
                </CommandEmpty>
                {items.length > 0 && (
                  <CommandGroup heading="Treffer">
                    {items.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => {
                          onChange({
                            id: c.id,
                            name: c.name,
                            yearLevel: c.yearLevel,
                          });
                          setOpen(false);
                        }}
                        className="min-h-11"
                      >
                        <span className="truncate">
                          {c.name} <span className="text-muted-foreground">· {c.yearLevel}. Klasse</span>
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
