import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { SchoolYearDto } from '@schoolflow/shared';

export interface StudentFilterValues {
  search: string;
  classId: string; // '' = Alle
  archived: 'active' | 'archived' | 'all';
  schoolYearId: string; // '' = default (active)
}

interface Props {
  values: StudentFilterValues;
  onChange: (next: StudentFilterValues) => void;
  classes: Array<{ id: string; name: string }>;
  schoolYears: SchoolYearDto[];
}

export function StudentFilterBar({ values, onChange, classes, schoolYears }: Props) {
  // Debounce search input 300ms
  const [localSearch, setLocalSearch] = useState(values.search);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== values.search) {
        onChange({ ...values, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  useEffect(() => {
    setLocalSearch(values.search);
  }, [values.search]);

  const isCustom =
    values.search !== '' ||
    values.classId !== '' ||
    values.archived !== 'active' ||
    values.schoolYearId !== '';

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4" role="search" aria-label="Schüler:innen-Filter">
      <Input
        className="sm:max-w-xs"
        placeholder="Name oder E-Mail suchen …"
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        aria-label="Nach Name oder E-Mail suchen"
      />

      <Select
        value={values.classId || 'all'}
        onValueChange={(v) => onChange({ ...values, classId: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="sm:w-48" aria-label="Klasse filtern">
          <SelectValue placeholder="Alle Klassen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Klassen</SelectItem>
          <SelectItem value="__none__">Ohne Stammklasse</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={values.archived}
        onValueChange={(v) =>
          onChange({ ...values, archived: v as StudentFilterValues['archived'] })
        }
      >
        <SelectTrigger className="sm:w-40" aria-label="Status filtern">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Aktiv</SelectItem>
          <SelectItem value="archived">Archiviert</SelectItem>
          <SelectItem value="all">Alle</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={values.schoolYearId || 'active'}
        onValueChange={(v) =>
          onChange({ ...values, schoolYearId: v === 'active' ? '' : v })
        }
      >
        <SelectTrigger className="sm:w-56" aria-label="Schuljahr filtern">
          <SelectValue placeholder="Aktives Schuljahr" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Aktives Schuljahr</SelectItem>
          {schoolYears.map((y) => (
            <SelectItem key={y.id} value={y.id}>
              {y.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCustom && (
        <Button
          variant="ghost"
          onClick={() =>
            onChange({ search: '', classId: '', archived: 'active', schoolYearId: '' })
          }
        >
          Filter zurücksetzen
        </Button>
      )}
    </div>
  );
}
