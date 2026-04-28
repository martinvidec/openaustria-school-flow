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
  useCreateVvz,
  useUpdateVvz,
  type VvzEntryDto,
} from '@/hooks/useVvz';

/**
 * Phase 15-07 Task 3: Create + edit dialog for VVZ-Einträge (Art. 30 DSGVO).
 *
 * DTO source of truth: apps/api/src/modules/dsgvo/dsfa/dto/create-vvz-entry.dto.ts
 *  - Required: schoolId, activityName, purpose, legalBasis,
 *              dataCategories[], affectedPersons[]
 *  - Optional: retentionPeriod, technicalMeasures, organizationalMeasures
 *
 * Both array fields (dataCategories, affectedPersons) are exposed as
 * comma-separated inputs — same UX pattern as DsfaEditDialog.
 */

type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  entry?: VvzEntryDto;
  schoolId: string;
  onClose: () => void;
}

function joinList(arr: string[] | undefined): string {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function VvzEditDialog({ open, mode, entry, schoolId, onClose }: Props) {
  const create = useCreateVvz();
  const update = useUpdateVvz();

  const [activityName, setActivityName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [dataCategoriesText, setDataCategoriesText] = useState('');
  const [affectedPersonsText, setAffectedPersonsText] = useState('');
  const [retentionPeriod, setRetentionPeriod] = useState('');
  const [technicalMeasures, setTechnicalMeasures] = useState('');
  const [organizationalMeasures, setOrganizationalMeasures] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && entry) {
      setActivityName(entry.activityName ?? '');
      setPurpose(entry.purpose ?? '');
      setLegalBasis(entry.legalBasis ?? '');
      setDataCategoriesText(joinList(entry.dataCategories));
      setAffectedPersonsText(joinList(entry.affectedPersons));
      setRetentionPeriod(entry.retentionPeriod ?? '');
      setTechnicalMeasures(entry.technicalMeasures ?? '');
      setOrganizationalMeasures(entry.organizationalMeasures ?? '');
    } else {
      setActivityName('');
      setPurpose('');
      setLegalBasis('');
      setDataCategoriesText('');
      setAffectedPersonsText('');
      setRetentionPeriod('');
      setTechnicalMeasures('');
      setOrganizationalMeasures('');
    }
    setErrors({});
  }, [open, mode, entry]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!activityName.trim()) e.activityName = 'Pflichtfeld.';
    if (!purpose.trim()) e.purpose = 'Pflichtfeld.';
    if (!legalBasis.trim()) e.legalBasis = 'Pflichtfeld.';
    if (splitList(dataCategoriesText).length === 0)
      e.dataCategories = 'Pflichtfeld.';
    if (splitList(affectedPersonsText).length === 0)
      e.affectedPersons = 'Pflichtfeld.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const dataCategories = splitList(dataCategoriesText);
    const affectedPersons = splitList(affectedPersonsText);
    const retention = retentionPeriod.trim();
    const technical = technicalMeasures.trim();
    const organizational = organizationalMeasures.trim();

    if (mode === 'create') {
      create.mutate(
        {
          schoolId,
          activityName: activityName.trim(),
          purpose: purpose.trim(),
          legalBasis: legalBasis.trim(),
          dataCategories,
          affectedPersons,
          ...(retention ? { retentionPeriod: retention } : {}),
          ...(technical ? { technicalMeasures: technical } : {}),
          ...(organizational ? { organizationalMeasures: organizational } : {}),
        },
        { onSuccess: onClose },
      );
    } else if (entry) {
      update.mutate(
        {
          id: entry.id,
          activityName: activityName.trim(),
          purpose: purpose.trim(),
          legalBasis: legalBasis.trim(),
          dataCategories,
          affectedPersons,
          retentionPeriod: retention,
          technicalMeasures: technical,
          organizationalMeasures: organizational,
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
            {mode === 'create' ? 'VVZ-Eintrag anlegen' : 'VVZ-Eintrag bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-1">
            <Label htmlFor="vvz-activity-name" className="text-muted-foreground">
              Verarbeitungstätigkeit
            </Label>
            <Input
              id="vvz-activity-name"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              autoFocus
            />
            {errors.activityName && (
              <p className="text-destructive text-xs">{errors.activityName}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="vvz-purpose" className="text-muted-foreground">
              Zweck
            </Label>
            <Textarea
              id="vvz-purpose"
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
            {errors.purpose && (
              <p className="text-destructive text-xs">{errors.purpose}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="vvz-legal-basis" className="text-muted-foreground">
              Rechtsgrundlage
            </Label>
            <Textarea
              id="vvz-legal-basis"
              rows={2}
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder="z.B. Art. 6 Abs. 1 lit. e DSGVO"
            />
            {errors.legalBasis && (
              <p className="text-destructive text-xs">{errors.legalBasis}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="vvz-data-categories"
              className="text-muted-foreground"
            >
              Datenkategorien (kommagetrennt)
            </Label>
            <Input
              id="vvz-data-categories"
              value={dataCategoriesText}
              onChange={(e) => setDataCategoriesText(e.target.value)}
              placeholder="z.B. Stammdaten, Kontaktdaten, Notenbild"
            />
            {errors.dataCategories && (
              <p className="text-destructive text-xs">
                {errors.dataCategories}
              </p>
            )}
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="vvz-affected-persons"
              className="text-muted-foreground"
            >
              Betroffene Personen (kommagetrennt)
            </Label>
            <Input
              id="vvz-affected-persons"
              value={affectedPersonsText}
              onChange={(e) => setAffectedPersonsText(e.target.value)}
              placeholder="z.B. Schüler, Lehrer, Eltern"
            />
            {errors.affectedPersons && (
              <p className="text-destructive text-xs">
                {errors.affectedPersons}
              </p>
            )}
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="vvz-retention-period"
              className="text-muted-foreground"
            >
              Aufbewahrungsdauer
            </Label>
            <Input
              id="vvz-retention-period"
              value={retentionPeriod}
              onChange={(e) => setRetentionPeriod(e.target.value)}
              placeholder='z.B. "60 Jahre" oder "bis Schulaustritt + 7 Jahre"'
            />
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="vvz-technical-measures"
              className="text-muted-foreground"
            >
              Technische Maßnahmen
            </Label>
            <Textarea
              id="vvz-technical-measures"
              rows={3}
              value={technicalMeasures}
              onChange={(e) => setTechnicalMeasures(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="vvz-organizational-measures"
              className="text-muted-foreground"
            >
              Organisatorische Maßnahmen
            </Label>
            <Textarea
              id="vvz-organizational-measures"
              rows={3}
              value={organizationalMeasures}
              onChange={(e) => setOrganizationalMeasures(e.target.value)}
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
