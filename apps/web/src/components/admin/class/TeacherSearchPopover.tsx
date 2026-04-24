import { useEffect, useState } from 'react';
import { CircleCheck, X, UserSearch } from 'lucide-react';
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
import { useTeacherSearch } from '@/hooks/useTeacherSearch';

interface Selected {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  schoolId: string;
  value?: Selected | null;
  onSelect: (teacher: Selected | null) => void;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * shadcn Command-Popover for Klassenvorstand (TeacherSearchPopover, D-08).
 *
 * 300ms debounce on the search input; fetch is gated to ≥2 chars by
 * `useTeacherSearch.enabled`. Clear-Icon emits `onSelect(null)` to clear
 * the Klassenvorstand server-side.
 */
export function TeacherSearchPopover({
  schoolId,
  value,
  onSelect,
  placeholder = 'Lehrer:in suchen …',
  ariaLabel = 'Klassenvorstand auswählen',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useTeacherSearch({
    schoolId,
    search: debounced,
    enabled: open,
  });

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-label={ariaLabel}>
            <UserSearch className="h-4 w-4 mr-2" />
            {value ? `${value.firstName} ${value.lastName}` : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Nachname eingeben …"
              aria-label="Lehrer:in-Suche"
            />
            <CommandList>
              {debounced.length < 2 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Mindestens 2 Zeichen eingeben.
                </div>
              ) : isFetching ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Suche läuft …
                </div>
              ) : (
                <>
                  <CommandEmpty>Keine Treffer.</CommandEmpty>
                  {data && data.length > 0 && (
                    <CommandGroup heading="Treffer">
                      {data.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.id}
                          onSelect={() => {
                            onSelect({
                              id: t.id,
                              firstName: t.person.firstName,
                              lastName: t.person.lastName,
                            });
                            setOpen(false);
                          }}
                        >
                          <CircleCheck className="h-4 w-4 text-green-600 mr-2" />
                          <span className="truncate">
                            {t.person.firstName} {t.person.lastName}
                            {t.person.email ? ` · ${t.person.email}` : ''}
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

      {value && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Klassenvorstand entfernen"
          onClick={() => onSelect(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
