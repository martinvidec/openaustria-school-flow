import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface ClassFilterValues {
  search: string;
  schoolYearId: string;
  yearLevel: string; // '' | 'all' | <1..13>
}

interface Props {
  values: ClassFilterValues;
  onChange: (next: ClassFilterValues) => void;
  schoolYears: Array<{ id: string; name: string; isActive?: boolean }>;
}

const YEAR_LEVEL_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1);

export function ClassFilterBar({ values, onChange, schoolYears }: Props) {
  const [searchLocal, setSearchLocal] = useState(values.search);

  useEffect(() => {
    setSearchLocal(values.search);
  }, [values.search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchLocal !== values.search) {
        onChange({ ...values, search: searchLocal });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchLocal}
          onChange={(e) => setSearchLocal(e.target.value)}
          placeholder="Name suchen …"
          className="pl-8"
          aria-label="Klassen-Suche"
        />
        {searchLocal && (
          <button
            type="button"
            onClick={() => setSearchLocal('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Suche leeren"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Select
        value={values.schoolYearId || 'active'}
        onValueChange={(v) => onChange({ ...values, schoolYearId: v === 'active' ? '' : v })}
      >
        <SelectTrigger className="w-full sm:w-[200px]" aria-label="Schuljahr">
          <SelectValue placeholder="Schuljahr" />
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

      <Select
        value={values.yearLevel || 'all'}
        onValueChange={(v) => onChange({ ...values, yearLevel: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Jahrgangsstufe">
          <SelectValue placeholder="Jahrgangsstufe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Jahrgangsstufen</SelectItem>
          {YEAR_LEVEL_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}. Klasse
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(values.search || values.schoolYearId || values.yearLevel) && (
        <Button
          variant="ghost"
          onClick={() =>
            onChange({ search: '', schoolYearId: '', yearLevel: '' })
          }
        >
          Zurücksetzen
        </Button>
      )}
    </div>
  );
}
