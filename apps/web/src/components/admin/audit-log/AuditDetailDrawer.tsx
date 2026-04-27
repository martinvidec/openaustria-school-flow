import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { JsonTree } from './JsonTree';
import type { AuditEntryDto } from '@/hooks/useAuditEntries';

/**
 * Phase 15-09 component: right-side Sheet that renders an audit entry's
 * Vorzustand (`entry.before`) + Nachzustand (`entry.metadata.body ??
 * entry.metadata`) as JSON trees. Closed when `entry === null`.
 *
 * Per UI-SPEC § Audit detail drawer: w-full mobile / w-[480px] desktop,
 * SheetHeader chips for action + resource + timestamp + actor, two
 * sections separated by `<Separator />`. Legacy entries (no before
 * snapshot — D-09 / D-10) render the muted-banner copy verbatim from
 * UI-SPEC § Empty states "Audit drawer no before snapshot".
 */

interface Props {
  open: boolean;
  entry: AuditEntryDto | null;
  onClose: () => void;
}

const TIMESTAMP_FMT = new Intl.DateTimeFormat('de-AT', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

function pickAfterValue(metadata: AuditEntryDto['metadata']): unknown {
  if (metadata && typeof metadata === 'object' && 'body' in metadata) {
    return (metadata as Record<string, unknown>).body;
  }
  return metadata ?? null;
}

export function AuditDetailDrawer({ open, entry, onClose }: Props) {
  if (!entry) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-full md:w-[480px]"
          aria-describedby={undefined}
        >
          <SheetHeader>
            <SheetTitle className="sr-only">Audit-Eintrag</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const afterValue = pickAfterValue(entry.metadata);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full md:w-[480px] flex flex-col overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Audit-Eintrag</SheetTitle>
          <SheetDescription asChild>
            <div className="text-sm text-muted-foreground">
              <span className="flex flex-wrap gap-2 items-center">
                <Badge variant="secondary">{entry.action}</Badge>
                <Badge variant="outline">{entry.resource}</Badge>
                <span>{TIMESTAMP_FMT.format(new Date(entry.createdAt))}</span>
              </span>
              <span className="block mt-2 text-xs">
                Akteur: {entry.actor?.email ?? entry.userId}
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <section>
          <h3 className="font-semibold text-sm mb-2">Vorzustand</h3>
          {entry.before ? (
            <JsonTree value={entry.before} />
          ) : (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag
              entstand vor dem Interceptor-Refactor in Phase 15).
            </div>
          )}
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="font-semibold text-sm mb-2">Nachzustand</h3>
          <JsonTree value={afterValue} />
        </section>
      </SheetContent>
    </Sheet>
  );
}
