import { cn } from '@/lib/utils';
import type { PollOptionDto } from '@schoolflow/shared';

/**
 * Per UI-SPEC COMM-06: Single horizontal result bar in poll results.
 * Default bar: bg-primary/20. User's vote: bg-primary/40.
 * Shows option text, vote count, percentage at end.
 */

interface PollResultBarProps {
  option: PollOptionDto;
  totalVotes: number;
  isUserVote: boolean;
}

export function PollResultBar({
  option,
  totalVotes,
  isUserVote,
}: PollResultBarProps) {
  const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
  const percentageStr = Math.round(percentage);

  return (
    <div className="relative h-10 rounded-md overflow-hidden bg-muted/50">
      {/* Bar fill */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-md transition-all duration-300',
          isUserVote ? 'bg-primary/40' : 'bg-primary/20',
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Content overlay */}
      <div className="relative flex items-center justify-between h-full px-3">
        <span className="text-sm truncate flex-1">{option.text}</span>
        <span className="text-[12px] font-semibold leading-[1.3] shrink-0 ml-2">
          {option.voteCount} ({percentageStr}%)
        </span>
      </div>
    </div>
  );
}
