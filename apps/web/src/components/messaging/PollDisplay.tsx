import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PollResultBar } from './PollResultBar';
import { useCastVote, useClosePoll } from '@/hooks/usePoll';
import type { PollDto, PollOptionDto } from '@schoolflow/shared';

/**
 * Per UI-SPEC COMM-06, D-09, D-10, D-11, D-12: Inline rendered poll in a message bubble.
 * Before voting: radio buttons (single) or checkboxes (multi).
 * After voting: result bars with percentages.
 * Sender/admin: named voter lists. Others: anonymous counts.
 */

interface PollDisplayProps {
  poll: PollDto;
  currentUserId: string;
  isSender: boolean;
  schoolId: string;
}

function getDeadlineInfo(deadline: string | null): {
  isApproaching: boolean;
  hoursLeft: number;
  label: string;
} | null {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();
  const hoursLeft = Math.ceil(diff / (1000 * 60 * 60));

  if (diff <= 0) {
    return { isApproaching: false, hoursLeft: 0, label: 'Abgeschlossen' };
  }
  if (hoursLeft <= 24) {
    return {
      isApproaching: true,
      hoursLeft,
      label: `Endet in ${hoursLeft} Stunden`,
    };
  }
  const dateStr = deadlineDate.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return {
    isApproaching: false,
    hoursLeft,
    label: `Endet am ${dateStr}`,
  };
}

export function PollDisplay({
  poll,
  currentUserId,
  isSender,
  schoolId,
}: PollDisplayProps) {
  const hasVoted = poll.userVoteOptionIds.length > 0;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const castVote = useCastVote(schoolId, poll.id);
  const closePoll = useClosePoll(schoolId, poll.id);

  const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
  const deadlineInfo = getDeadlineInfo(poll.deadline);
  const isPollClosed =
    poll.isClosed || (deadlineInfo !== null && deadlineInfo.hoursLeft <= 0);
  const showResults = hasVoted || isPollClosed;

  const handleSingleVote = useCallback(
    async (optionId: string) => {
      try {
        await castVote.mutateAsync({ optionIds: [optionId] });
        toast.success('Stimme abgegeben');
      } catch {
        toast.error(
          'Stimme konnte nicht abgegeben werden. Bitte versuchen Sie es erneut.',
        );
      }
    },
    [castVote],
  );

  const handleMultiVote = useCallback(async () => {
    if (selectedOptions.length === 0) return;
    try {
      await castVote.mutateAsync({ optionIds: selectedOptions });
      toast.success('Stimme abgegeben');
      setSelectedOptions([]);
    } catch {
      toast.error(
        'Stimme konnte nicht abgegeben werden. Bitte versuchen Sie es erneut.',
      );
    }
  }, [castVote, selectedOptions]);

  const handleClosePoll = useCallback(async () => {
    try {
      await closePoll.mutateAsync();
    } catch {
      // Silently handled
    }
  }, [closePoll]);

  const toggleMultiOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    );
  };

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      {/* Header: question + status badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-[1.4] flex-1">
          {poll.question}
        </p>
        <Badge
          variant="outline"
          className={cn(
            isPollClosed
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary/[0.15] text-primary',
          )}
        >
          {isPollClosed ? 'Abgeschlossen' : 'Offen'}
        </Badge>
      </div>

      {/* Deadline warning */}
      {deadlineInfo && !isPollClosed && deadlineInfo.isApproaching && (
        <p className="text-[12px] text-[hsl(38_92%_50%)] leading-[1.3]">
          {deadlineInfo.label}
        </p>
      )}
      {deadlineInfo && !deadlineInfo.isApproaching && deadlineInfo.hoursLeft > 0 && (
        <p className="text-[12px] text-muted-foreground leading-[1.3]">
          {deadlineInfo.label}
        </p>
      )}

      {/* Options: vote inputs or result bars */}
      <div className="space-y-2">
        {showResults ? (
          /* Result bars */
          poll.options.map((option) => (
            <div key={option.id}>
              <PollResultBar
                option={option}
                totalVotes={totalVotes}
                isUserVote={poll.userVoteOptionIds.includes(option.id)}
              />
              {/* Sender/admin: expand to see voter names */}
              {isSender && option.voters && option.voters.length > 0 && (
                <button
                  type="button"
                  className="text-[12px] text-primary hover:underline ml-1 mt-0.5"
                  onClick={() =>
                    setExpandedOption(
                      expandedOption === option.id ? null : option.id,
                    )
                  }
                >
                  {option.voteCount} Stimmen
                </button>
              )}
              {isSender &&
                expandedOption === option.id &&
                option.voters &&
                option.voters.length > 0 && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    {option.voters.map((v) => (
                      <p
                        key={v.userId}
                        className="text-[12px] text-muted-foreground"
                      >
                        {v.name}
                      </p>
                    ))}
                  </div>
                )}
            </div>
          ))
        ) : (
          /* Vote inputs */
          <>
            {poll.options.map((option) =>
              poll.type === 'SINGLE_CHOICE' ? (
                <button
                  key={option.id}
                  type="button"
                  className="flex items-center gap-3 w-full h-12 px-3 rounded-md border border-border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSingleVote(option.id)}
                  disabled={castVote.isPending || isPollClosed}
                >
                  <span className="h-4 w-4 rounded-full border-2 border-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{option.text}</span>
                </button>
              ) : (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'flex items-center gap-3 w-full h-12 px-3 rounded-md border transition-colors text-left',
                    selectedOptions.includes(option.id)
                      ? 'border-primary bg-primary/[0.08]'
                      : 'border-border hover:bg-muted/50',
                  )}
                  onClick={() => toggleMultiOption(option.id)}
                  disabled={isPollClosed}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-sm border-2 shrink-0 flex items-center justify-center',
                      selectedOptions.includes(option.id)
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground',
                    )}
                  >
                    {selectedOptions.includes(option.id) && (
                      <span className="text-primary-foreground text-[10px] font-bold">
                        &#10003;
                      </span>
                    )}
                  </span>
                  <span className="text-sm flex-1">{option.text}</span>
                </button>
              ),
            )}

            {/* Multi-choice submit button */}
            {poll.type === 'MULTIPLE_CHOICE' && (
              <Button
                type="button"
                size="sm"
                onClick={handleMultiVote}
                disabled={
                  selectedOptions.length === 0 ||
                  castVote.isPending ||
                  isPollClosed
                }
                className="mt-1"
              >
                {castVote.isPending ? 'Wird gesendet...' : 'Stimme abgeben'}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Sender close action */}
      {isSender && !isPollClosed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClosePoll}
          disabled={closePoll.isPending}
          className="text-muted-foreground"
        >
          Umfrage schliessen
        </Button>
      )}
    </div>
  );
}
