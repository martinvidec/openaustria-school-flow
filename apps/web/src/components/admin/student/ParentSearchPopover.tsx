import { useState } from 'react';
import { CircleCheck, UserPlus } from 'lucide-react';
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
import { useLinkParentToStudent, useParentsByEmail } from '@/hooks/useParents';
import { InlineCreateParentForm } from './InlineCreateParentForm';

interface Props {
  schoolId: string;
  studentId: string;
  onLinked?: () => void;
}

export function ParentSearchPopover({ schoolId, studentId, onLinked }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [showInlineCreate, setShowInlineCreate] = useState(false);

  const { data, isFetching } = useParentsByEmail({
    schoolId,
    email,
    enabled: open && !showInlineCreate,
  });

  const linkMutation = useLinkParentToStudent(studentId);

  const handleSelect = async (parentId: string) => {
    try {
      await linkMutation.mutateAsync(parentId);
      setOpen(false);
      setEmail('');
      setShowInlineCreate(false);
      onLinked?.();
    } catch {
      // toast fired by hook onError
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Erziehungsberechtigte:n verknüpfen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        {showInlineCreate ? (
          <div className="p-4">
            <InlineCreateParentForm
              schoolId={schoolId}
              studentId={studentId}
              initialEmail={email}
              onCancel={() => setShowInlineCreate(false)}
              onCreated={() => {
                setShowInlineCreate(false);
                setOpen(false);
                setEmail('');
                onLinked?.();
              }}
            />
          </div>
        ) : (
          <Command shouldFilter={false}>
            <CommandInput
              value={email}
              onValueChange={setEmail}
              placeholder="E-Mail eingeben …"
              aria-label="E-Mail-Suche"
            />
            <CommandList>
              {email.length < 3 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Mindestens 3 Zeichen eingeben.
                </div>
              ) : isFetching ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Suche läuft …
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="flex flex-col items-center gap-2 p-2">
                      <span>Keine Treffer. Neu:e Erziehungsberechtigte:n anlegen?</span>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setShowInlineCreate(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Neu anlegen
                      </Button>
                    </div>
                  </CommandEmpty>
                  {data && data.data.length > 0 && (
                    <CommandGroup heading="Treffer">
                      {data.data.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.id}
                          onSelect={() => handleSelect(p.id)}
                        >
                          <CircleCheck className="h-4 w-4 text-green-600 mr-2" />
                          <span className="truncate">
                            {p.person.firstName} {p.person.lastName} · {p.person.email}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
