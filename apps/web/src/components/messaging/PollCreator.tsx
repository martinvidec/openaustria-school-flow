import { useState, useCallback, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PollType } from '@schoolflow/shared';

/**
 * Per UI-SPEC COMM-06, D-09, D-11: Inline poll creation form within ComposeDialog.
 * Fields: question Input, type Select (Einzelauswahl/Mehrfachauswahl),
 * option rows (start with 2, add up to 10, remove when >2), optional deadline.
 */

export interface PollInput {
  question: string;
  type: PollType;
  options: string[];
  deadline?: string;
}

interface PollCreatorProps {
  onPollChange: (poll: PollInput | null) => void;
  initialPoll?: PollInput;
}

export function PollCreator({ onPollChange, initialPoll }: PollCreatorProps) {
  const [question, setQuestion] = useState(initialPoll?.question ?? '');
  const [pollType, setPollType] = useState<PollType>(
    initialPoll?.type ?? 'SINGLE_CHOICE',
  );
  const [options, setOptions] = useState<string[]>(
    initialPoll?.options ?? ['', ''],
  );
  const [deadline, setDeadline] = useState(initialPoll?.deadline ?? '');

  // Validation state
  const questionError = question.length === 0 ? null : '';
  const optionsError =
    options.length < 2
      ? 'Mindestens 2 Antwortmoeglichkeiten erforderlich.'
      : options.length > 10
        ? 'Maximal 10 Antwortmoeglichkeiten.'
        : null;

  // Propagate changes to parent on every update
  useEffect(() => {
    const hasValidQuestion = question.trim().length > 0;
    const hasValidOptions =
      options.filter((o) => o.trim().length > 0).length >= 2;

    if (hasValidQuestion && hasValidOptions) {
      onPollChange({
        question: question.trim(),
        type: pollType,
        options: options.filter((o) => o.trim().length > 0),
        deadline: deadline || undefined,
      });
    } else {
      onPollChange(null);
    }
  }, [question, pollType, options, deadline, onPollChange]);

  const handleOptionChange = useCallback(
    (index: number, value: string) => {
      const next = [...options];
      next[index] = value;
      setOptions(next);
    },
    [options],
  );

  const handleAddOption = useCallback(() => {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  }, [options]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      if (options.length <= 2) return;
      setOptions(options.filter((_, i) => i !== index));
    },
    [options],
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm font-semibold">Umfrage erstellen</p>

      {/* Question */}
      <div className="space-y-1.5">
        <Label htmlFor="poll-question">Frage</Label>
        <input
          id="poll-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ihre Frage eingeben"
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {/* Poll type */}
      <div className="space-y-1.5">
        <Label htmlFor="poll-type">Abstimmungsart</Label>
        <Select
          value={pollType}
          onValueChange={(val) => setPollType(val as PollType)}
        >
          <SelectTrigger id="poll-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SINGLE_CHOICE">Einzelauswahl</SelectItem>
            <SelectItem value="MULTIPLE_CHOICE">Mehrfachauswahl</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      <div className="space-y-1.5">
        <Label>Antwortmoeglichkeiten</Label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveOption(index)}
                  aria-label="Option entfernen"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {optionsError && (
          <p className="text-sm text-destructive">{optionsError}</p>
        )}

        {options.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="gap-2 mt-1"
          >
            <Plus className="h-4 w-4" />
            Option hinzufuegen
          </Button>
        )}
      </div>

      {/* Optional deadline */}
      <div className="space-y-1.5">
        <Label htmlFor="poll-deadline">Frist (optional)</Label>
        <input
          id="poll-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          placeholder="Kein Enddatum"
          className="flex h-11 min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );
}
