import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ImportConflictMode } from '@schoolflow/shared';

interface UntisParseResult {
  teacherCount: number;
  classCount: number;
  roomCount: number;
  lessonCount: number;
  teachers?: Array<Record<string, string>>;
  classes?: Array<Record<string, string>>;
  rooms?: Array<Record<string, string>>;
  lessons?: Array<Record<string, string>>;
}

interface ImportUntisPreviewProps {
  parsedData: UntisParseResult;
  onConflictModeChange: (mode: ImportConflictMode) => void;
  onNext: () => void;
}

const CONFLICT_OPTIONS: { value: ImportConflictMode; label: string }[] = [
  { value: 'SKIP', label: 'Ueberspringen' },
  { value: 'UPDATE', label: 'Aktualisieren' },
  { value: 'FAIL', label: 'Import abbrechen' },
];

interface ExpandableSectionProps {
  title: string;
  count: number;
  records?: Array<Record<string, string>>;
}

function ExpandableSection({ title, count, records }: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (count === 0) return null;

  const preview = (records ?? []).slice(0, 5);
  const columns = preview.length > 0 ? Object.keys(preview[0]!) : [];

  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span>
          {title} ({count})
        </span>
      </button>

      {expanded && preview.length > 0 && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-2 py-1 font-semibold whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-2 py-1 text-muted-foreground whitespace-nowrap"
                    >
                      {row[col] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * ImportUntisPreview -- Step 2 for Untis XML imports.
 *
 * Card showing parsed entity counts. Expandable sections per entity type
 * showing first 5 records. Conflict mode selector at bottom.
 *
 * UI-SPEC: "{teacherCount} Lehrer, {classCount} Klassen, {roomCount} Raeume,
 * {lessonCount} Stunden"
 */
export function ImportUntisPreview({
  parsedData,
  onConflictModeChange,
  onNext,
}: ImportUntisPreviewProps) {
  const [conflictMode, setConflictMode] = useState<ImportConflictMode>('SKIP');

  function handleConflictMode(mode: ImportConflictMode) {
    setConflictMode(mode);
    onConflictModeChange(mode);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-semibold leading-[1.2] mb-2">
          Untis-Daten erkannt
        </h3>
        <p className="text-sm text-muted-foreground">
          Untis GPU-Datei erkannt. Enthaltene Daten:{' '}
          {parsedData.teacherCount} Lehrer, {parsedData.classCount} Klassen,{' '}
          {parsedData.roomCount} Raeume, {parsedData.lessonCount} Stunden.
        </p>
      </div>

      <div className="space-y-2">
        <ExpandableSection
          title="Lehrer"
          count={parsedData.teacherCount}
          records={parsedData.teachers}
        />
        <ExpandableSection
          title="Klassen"
          count={parsedData.classCount}
          records={parsedData.classes}
        />
        <ExpandableSection
          title="Raeume"
          count={parsedData.roomCount}
          records={parsedData.rooms}
        />
        <ExpandableSection
          title="Stunden"
          count={parsedData.lessonCount}
          records={parsedData.lessons}
        />
      </div>

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
        <Button onClick={onNext}>Weiter</Button>
      </div>
    </div>
  );
}
