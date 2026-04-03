import { useState, useRef, useCallback, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateLessonContent, useRecentEntries } from '@/hooks/useClassbook';

interface LessonContentFormProps {
  entryId: string;
  schoolId: string;
  initialData: {
    thema: string | null;
    lehrstoff: string | null;
    hausaufgabe: string | null;
  };
}

/**
 * Structured lesson content form with auto-save on blur.
 * Three fields: Thema, Lehrstoff, Hausaufgabe -- per Austrian Klassenbuch format.
 *
 * Per UI-SPEC D-09:
 * - Auto-save on blur with 1s debounce
 * - "Gespeichert" indicator per field after successful save, fades after 2s
 * - Thema: character count guidance after 50 chars
 * - Collapsible "Letzte Eintraege" section showing last 3 entries
 */
export function LessonContentForm({
  entryId,
  schoolId,
  initialData,
}: LessonContentFormProps) {
  const updateMutation = useUpdateLessonContent(schoolId, entryId);
  const { data: recentEntries } = useRecentEntries(schoolId, entryId);

  // Local state for each field
  const [thema, setThema] = useState(initialData.thema ?? '');
  const [lehrstoff, setLehrstoff] = useState(initialData.lehrstoff ?? '');
  const [hausaufgabe, setHausaufgabe] = useState(initialData.hausaufgabe ?? '');

  // "Gespeichert" indicators
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recent entries expand state
  const [showRecent, setShowRecent] = useState(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showSavedIndicator = useCallback((fieldName: string) => {
    setSavedFields((prev) => ({ ...prev, [fieldName]: true }));
    // Clear any existing timer for this field
    if (saveTimersRef.current[fieldName]) {
      clearTimeout(saveTimersRef.current[fieldName]);
    }
    // Fade after 2s
    saveTimersRef.current[fieldName] = setTimeout(() => {
      setSavedFields((prev) => ({ ...prev, [fieldName]: false }));
    }, 2000);
  }, []);

  const handleBlurSave = useCallback(
    (fieldName: string, value: string) => {
      // Debounce 1s
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        updateMutation.mutate(
          { [fieldName]: value },
          {
            onSuccess: () => {
              showSavedIndicator(fieldName);
            },
          },
        );
      }, 1000);
    },
    [updateMutation, showSavedIndicator],
  );

  return (
    <div className="space-y-4">
      {/* Thema field */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="thema">Thema</Label>
          {savedFields.thema && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 animate-in fade-in">
              <Check className="h-3 w-3" />
              Gespeichert
            </span>
          )}
        </div>
        <Textarea
          id="thema"
          value={thema}
          onChange={(e) => setThema(e.target.value)}
          onBlur={() => handleBlurSave('thema', thema)}
          placeholder="Thema der Stunde eingeben"
          rows={1}
          className="min-h-[40px] resize-none"
        />
        {thema.length > 50 && (
          <p className="text-xs text-muted-foreground">{thema.length} Zeichen</p>
        )}
      </div>

      {/* Lehrstoff field */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="lehrstoff">Lehrstoff</Label>
          {savedFields.lehrstoff && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 animate-in fade-in">
              <Check className="h-3 w-3" />
              Gespeichert
            </span>
          )}
        </div>
        <Textarea
          id="lehrstoff"
          value={lehrstoff}
          onChange={(e) => setLehrstoff(e.target.value)}
          onBlur={() => handleBlurSave('lehrstoff', lehrstoff)}
          placeholder="Behandelter Lehrstoff beschreiben"
          rows={3}
        />
      </div>

      {/* Hausaufgabe field */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="hausaufgabe">Hausaufgabe</Label>
          {savedFields.hausaufgabe && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 animate-in fade-in">
              <Check className="h-3 w-3" />
              Gespeichert
            </span>
          )}
        </div>
        <Textarea
          id="hausaufgabe"
          value={hausaufgabe}
          onChange={(e) => setHausaufgabe(e.target.value)}
          onBlur={() => handleBlurSave('hausaufgabe', hausaufgabe)}
          placeholder="Hausaufgabe fuer die naechste Stunde"
          rows={2}
        />
      </div>

      {/* Recent entries section */}
      {recentEntries && recentEntries.length > 0 && (
        <div className="border-t pt-4 mt-6">
          <button
            type="button"
            onClick={() => setShowRecent(!showRecent)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showRecent ? 'Letzte Eintraege ausblenden' : 'Letzte Eintraege anzeigen'}
          </button>

          {showRecent && (
            <div className="mt-3 space-y-4">
              {recentEntries.slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-md border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(entry.date).toLocaleDateString('de-AT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}{' '}
                    - {entry.periodNumber}. Stunde
                  </p>
                  {entry.thema && (
                    <p className="text-sm">
                      <span className="font-medium">Thema:</span> {entry.thema}
                    </p>
                  )}
                  {entry.lehrstoff && (
                    <p className="text-sm">
                      <span className="font-medium">Lehrstoff:</span> {entry.lehrstoff}
                    </p>
                  )}
                  {entry.hausaufgabe && (
                    <p className="text-sm">
                      <span className="font-medium">Hausaufgabe:</span> {entry.hausaufgabe}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
