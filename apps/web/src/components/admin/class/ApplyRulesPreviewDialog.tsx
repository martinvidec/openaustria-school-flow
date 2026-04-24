import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApplyRules, useApplyRulesPreview } from '@/hooks/useGroupDerivationRules';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onApplied?: () => void;
}

export function ApplyRulesPreviewDialog({
  open,
  onOpenChange,
  classId,
  onApplied,
}: Props) {
  const previewQuery = useApplyRulesPreview(classId, open);
  const applyMutation = useApplyRules(classId);

  const preview = previewQuery.data;

  const handleConfirm = async () => {
    try {
      await applyMutation.mutateAsync();
      onOpenChange(false);
      onApplied?.();
    } catch {
      // toast fired by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regel-Anwendung Vorschau</DialogTitle>
          <DialogDescription>
            Diese Aktion erstellt Gruppen und ordnet Schüler:innen zu. Manuelle Zuordnungen bleiben erhalten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {previewQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Vorschau lädt …</p>
          )}

          {preview && (
            <>
              <section className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Neue Gruppen ({preview.newGroups.length})</h4>
                </div>
                {preview.newGroups.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {preview.newGroups.map((g) => (
                      <li key={`${g.groupType}-${g.name}`}>
                        <Badge variant="secondary" className="mr-2">
                          {g.groupType}
                        </Badge>
                        {g.name}
                        {g.level ? ` (${g.level})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-md border p-3">
                <h4 className="font-semibold">
                  Neue Mitgliedschaften ({preview.newMemberships.length})
                </h4>
              </section>

              {preview.conflicts.length > 0 && (
                <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <h4 className="font-semibold text-amber-900">
                    Konflikte ({preview.conflicts.length})
                  </h4>
                  <p className="text-xs text-amber-900 mt-1">
                    Diese Schüler:innen haben manuelle Zuordnungen, die unberührt bleiben.
                  </p>
                </section>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={applyMutation.isPending || !preview}
          >
            Anwenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
