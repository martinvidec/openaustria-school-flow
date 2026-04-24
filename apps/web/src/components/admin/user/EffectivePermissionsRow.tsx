import { CircleCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SourceChip } from './SourceChip';
import type { EffectivePermissionRow as Row } from '@/features/users/types';

/**
 * Phase 13-02 — single ability row inside an Effective-Permissions
 * subject-group accordion panel.
 *
 * Columns: Aktion | Status | Quelle | Bedingungen
 *  - Status pairs color + icon + text label (UI-SPEC §142)
 *  - row background `bg-destructive/5` if granted=false (no row-tint
 *    on grants to keep scan-ability — UI-SPEC §129)
 *  - Bedingungen: `—` if null, otherwise compact JSON preview with
 *    tooltip showing interpolated form under `Aufgelöst:` header
 */

interface Props {
  row: Row;
  onSourceClick?: (row: Row) => void;
}

export function EffectivePermissionsRow({ row, onSourceClick }: Props) {
  const conditionsCompact =
    row.conditions === null
      ? null
      : JSON.stringify(row.conditions);
  return (
    <tr
      className={cn(
        'border-b last:border-b-0 hover:bg-accent/30',
        !row.granted && 'bg-destructive/5',
      )}
    >
      <td className="py-2 px-3">
        <span className="inline-flex items-center rounded-md border bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-semibold">
          {row.action}
        </span>
      </td>
      <td className="py-2 px-3">
        {row.granted ? (
          <span className="inline-flex items-center gap-1 text-success text-sm font-semibold">
            <CircleCheck className="h-4 w-4" aria-hidden /> Erlaubt
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-destructive text-sm font-semibold">
            <XCircle className="h-4 w-4" aria-hidden /> Verweigert
          </span>
        )}
      </td>
      <td className="py-2 px-3">
        <SourceChip
          source={row.source}
          onClick={onSourceClick ? () => onSourceClick(row) : undefined}
        />
      </td>
      <td className="py-2 px-3 max-w-xs">
        {conditionsCompact === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <code className="font-mono text-xs truncate block">{conditionsCompact}</code>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-xs font-semibold">Aufgelöst:</p>
                <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(row.interpolatedConditions ?? row.conditions, null, 2)}
                </pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </td>
    </tr>
  );
}
