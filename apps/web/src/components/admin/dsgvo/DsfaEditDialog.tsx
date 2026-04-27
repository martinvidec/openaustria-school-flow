import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  useCreateDsfa,
  useUpdateDsfa,
  type DsfaEntryDto,
} from '@/hooks/useDsfa';

/**
 * Phase 15-07 Task 1: Create + edit dialog for DSFA-Einträge (Art. 35 DSGVO).
 *
 * DTO source of truth: apps/api/src/modules/dsgvo/dsfa/dto/create-dsfa-entry.dto.ts
 *  - Required: schoolId, title, description, dataCategories[]
 *  - Optional: riskAssessment, mitigationMeasures
 *
 * The dataCategories array is exposed in the UI as a comma-separated input
 * (consistent across the app — see e.g. ImportFieldMappingDialog) so the
 * admin can type "Schueler-Stammdaten, Klassenfoto, Notenbild" and the
 * dialog converts to ["Schueler-Stammdaten", "Klassenfoto", "Notenbild"].
 */

type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  entry?: DsfaEntryDto;
  schoolId: string;
  onClose: () => void;
}

function joinCategories(arr: string[] | undefined): string {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function splitCategories(s: string): string[] {
  return s
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function DsfaEditDialog({ open, mode, entry, schoolId, onClose }: Props) {
  const create = useCreateDsfa();
  const update = useUpdateDsfa();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dataCategoriesText, setDataCategoriesText] = useState('');
  const [riskAssessment, setRiskAssessment] = useState('');
  const [mitigationMeasures, setMitigationMeasures] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && entry) {
      setTitle(entry.title ?? '');
      setDescription(entry.description ?? '');
      setDataCategoriesText(joinCategories(entry.dataCategories));
      setRiskAssessment(entry.riskAssessment ?? '');
      setMitigationMeasures(entry.mitigationMeasures ?? '');
    } else {
      setTitle('');
      setDescription('');
      setDataCategoriesText('');
      setRiskAssessment('');
      setMitigationMeasures('');
    }
    setErrors({});
  }, [open, mode, entry]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Pflichtfeld.';
    if (!description.trim()) e.description = 'Pflichtfeld.';
    if (splitCategories(dataCategoriesText).length === 0)
      e.dataCategories = 'Pflichtfeld.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const dataCategories = splitCategories(dataCategoriesText);
    const riskAssessmentTrimmed = riskAssessment.trim();
    const mitigationMeasuresTrimmed = mitigationMeasures.trim();

    if (mode === 'create') {
      create.mutate(
        {
          schoolId,
          title: title.trim(),
          description: description.trim(),
          dataCategories,
          ...(riskAssessmentTrimmed
            ? { riskAssessment: riskAssessmentTrimmed }
            : {}),
          ...(mitigationMeasuresTrimmed
            ? { mitigationMeasures: mitigationMeasuresTrimmed }
            : {}),
        },
        { onSuccess: onClose },
      );
    } else if (entry) {
      update.mutate(
        {
          id: entry.id,
          title: title.trim(),
          description: description.trim(),
          dataCategories,
          riskAssessment: riskAssessmentTrimmed,
          mitigationMeasures: mitigationMeasuresTrimmed,
        },
        { onSuccess: onClose },
      );
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'DSFA anlegen' : 'DSFA bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            Datenschutz-Folgenabschätzung (Art. 35 DSGVO).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-1">
            <Label htmlFor="dsfa-title" className="text-muted-foreground">
              Titel
            </Label>
            <Input
              id="dsfa-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="dsfa-description" className="text-muted-foreground">
              Beschreibung der Verarbeitung
            </Label>
            <Textarea
              id="dsfa-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="dsfa-data-categories"
              className="text-muted-foreground"
            >
              Datenkategorien (kommagetrennt)
            </Label>
            <Input
              id="dsfa-data-categories"
              value={dataCategoriesText}
              onChange={(e) => setDataCategoriesText(e.target.value)}
              placeholder="z.B. Stammdaten, Notenbild, Fotos"
            />
            {errors.dataCategories && (
              <p className="text-destructive text-xs">
                {errors.dataCategories}
              </p>
            )}
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="dsfa-risk-assessment"
              className="text-muted-foreground"
            >
              Risikobewertung
            </Label>
            <Textarea
              id="dsfa-risk-assessment"
              rows={3}
              value={riskAssessment}
              onChange={(e) => setRiskAssessment(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="dsfa-mitigation-measures"
              className="text-muted-foreground"
            >
              Schutzmaßnahmen
            </Label>
            <Textarea
              id="dsfa-mitigation-measures"
              rows={3}
              value={mitigationMeasures}
              onChange={(e) => setMitigationMeasures(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              {mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
