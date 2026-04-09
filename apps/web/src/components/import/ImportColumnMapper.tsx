import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ColumnMappingField, ImportConflictMode } from '@schoolflow/shared';

interface ImportColumnMapperProps {
  headers: string[];
  sampleData: string[][];
  targetFields: ColumnMappingField[];
  onMappingChange: (mapping: Record<string, string>) => void;
  onConflictModeChange: (mode: ImportConflictMode) => void;
  onNext: () => void;
}

const CONFLICT_OPTIONS: { value: ImportConflictMode; label: string }[] = [
  { value: 'SKIP', label: 'Ueberspringen' },
  { value: 'UPDATE', label: 'Aktualisieren' },
  { value: 'FAIL', label: 'Import abbrechen' },
];

/**
 * ImportColumnMapper -- Step 2 for CSV imports.
 *
 * Inline HTML table: left column shows detected CSV headers with 3-row sample
 * data preview (12px cells), right column has Select dropdowns mapping to
 * SchoolFlow fields. Required fields marked with red asterisk.
 * "Ueberspringen" as default option. Conflict mode selector at bottom.
 * "Weiter" button enabled only when all required fields are mapped.
 *
 * UI-SPEC: "Spalten zuordnen", "Ordnen Sie jede Spalte aus Ihrer Datei
 * dem entsprechenden SchoolFlow-Feld zu."
 */
export function ImportColumnMapper({
  headers,
  sampleData,
  targetFields,
  onMappingChange,
  onConflictModeChange,
  onNext,
}: ImportColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    headers.forEach((h) => {
      initial[h] = '__skip__';
    });
    return initial;
  });

  const [conflictMode, setConflictMode] = useState<ImportConflictMode>('SKIP');

  const requiredFields = useMemo(
    () => targetFields.filter((f) => f.required).map((f) => f.key),
    [targetFields],
  );

  const mappedValues = useMemo(() => Object.values(mapping), [mapping]);

  const allRequiredMapped = useMemo(
    () => requiredFields.every((req) => mappedValues.includes(req)),
    [requiredFields, mappedValues],
  );

  function handleMappingSelect(header: string, targetKey: string) {
    const newMapping = { ...mapping, [header]: targetKey };
    setMapping(newMapping);

    // Build clean mapping without skipped
    const clean: Record<string, string> = {};
    for (const [h, v] of Object.entries(newMapping)) {
      if (v !== '__skip__') {
        clean[h] = v;
      }
    }
    onMappingChange(clean);
  }

  function handleConflictMode(mode: ImportConflictMode) {
    setConflictMode(mode);
    onConflictModeChange(mode);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-semibold leading-[1.2] mb-2">
          Spalten zuordnen
        </h3>
        <p className="text-sm text-muted-foreground">
          Ordnen Sie jede Spalte aus Ihrer Datei dem entsprechenden
          SchoolFlow-Feld zu. Nicht benoetigte Spalten koennen Sie ueberspringen.
        </p>
      </div>

      {/* Mobile: stacked cards (one per column) */}
      <div className="sm:hidden space-y-3">
        {headers.map((header, idx) => (
          <div
            key={header}
            className="rounded-md border border-border p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-sm">{header}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Vorschau:</span>
              {sampleData.slice(0, 3).map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="text-xs text-muted-foreground truncate"
                >
                  {row[idx] ?? ''}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold">SchoolFlow-Feld:</span>
              <Select
                value={mapping[header]}
                onValueChange={(v) => handleMappingSelect(header, v)}
              >
                <SelectTrigger className="w-full min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">Ueberspringen</SelectItem>
                  {targetFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet/desktop: table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Quelldatei-Spalte
              </th>
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Vorschau
              </th>
              <th className="text-left py-2 px-3 font-semibold text-xs">
                SchoolFlow-Feld
              </th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, idx) => (
              <tr key={header} className="border-b border-border">
                <td className="py-2 px-3 font-semibold text-xs whitespace-nowrap">
                  {header}
                </td>
                <td className="py-2 px-3">
                  <div className="space-y-0.5">
                    {sampleData.slice(0, 3).map((row, rowIdx) => (
                      <div
                        key={rowIdx}
                        className="text-xs text-muted-foreground truncate max-w-[200px]"
                      >
                        {row[idx] ?? ''}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <Select
                    value={mapping[header]}
                    onValueChange={(v) => handleMappingSelect(header, v)}
                  >
                    <SelectTrigger className="w-[200px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Ueberspringen</SelectItem>
                      {targetFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Required fields hint */}
      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> Pflichtfelder muessen
        zugeordnet werden.
      </p>

      {/* Conflict mode selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Bei Duplikaten</label>
        <Select
          value={conflictMode}
          onValueChange={(v) => handleConflictMode(v as ImportConflictMode)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONFLICT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!allRequiredMapped}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
