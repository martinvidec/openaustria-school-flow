import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { HandoverNoteDto } from '@schoolflow/shared';

interface HandoverNoteViewProps {
  note: HandoverNoteDto | null;
  /**
   * Which empty state copy to render. 'substitute' (default) tells the
   * substitute teacher that the absent teacher has not left a note yet;
   * 'author' tells the absent teacher that they have not authored one.
   */
  emptyContext?: 'substitute' | 'author';
}

/**
 * SUBST-04 (D-15) — Read-only rendering of a handover note.
 *
 * Shown inside the SubstituteOfferCard on /teacher/substitutions so the
 * substitute teacher can read context BEFORE accepting the offer (D-15).
 * Also reused by the absent teacher's own view.
 *
 * Empty state copy is taken verbatim from 06-UI-SPEC.md Copywriting Contract.
 */
export function HandoverNoteView({
  note,
  emptyContext = 'substitute',
}: HandoverNoteViewProps) {
  if (!note) {
    return (
      <div className="text-center py-4">
        <p className="text-sm font-semibold">Keine Uebergabenotiz vorhanden</p>
        <p className="text-xs text-muted-foreground mt-1">
          {emptyContext === 'substitute'
            ? 'Der abwesende Lehrer hat keine Notiz hinterlegt.'
            : 'Sie haben noch keine Uebergabenotiz verfasst.'}
        </p>
      </div>
    );
  }

  const createdAt = new Date(note.createdAt).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="text-xs text-muted-foreground">
        {note.authorName} &middot; {createdAt}
      </div>
      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
      {note.attachments.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2">Anhaenge</p>
          <ul className="space-y-1">
            {note.attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate mr-2">{a.filename}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="shrink-0 h-8"
                >
                  <a
                    href={`/api/v1/handover-notes/attachments/${a.id}`}
                    download={a.filename}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
