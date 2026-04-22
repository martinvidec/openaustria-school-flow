import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InfoBanner } from '@/components/admin/shared/InfoBanner';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import { calculateMaxTeachingHours } from '@schoolflow/shared';
import type { TeacherDto } from '@/hooks/useTeachers';

/**
 * LehrverpflichtungTab — Tab 2 of the teacher detail page.
 *
 * Live-computes the effective Werteinheiten using the SAME shared helper
 * the backend uses (`calculateMaxTeachingHours` from `@schoolflow/shared`)
 * so FE/BE are byte-identical per D-05.
 */
interface Props {
  teacher: TeacherDto;
  onSave: (values: { employmentPercentage: number; werteinheitenTarget: number }) => Promise<void> | void;
  isSaving?: boolean;
}

export function LehrverpflichtungTab({ teacher, onSave, isSaving = false }: Props) {
  const [employmentPercentage, setEmploymentPercentage] = useState(teacher.employmentPercentage);
  const [werteinheitenTarget, setWerteinheitenTarget] = useState(teacher.werteinheitenTarget);

  const reductions = teacher.reductions ?? [];

  const effectiveWE = useMemo(
    () => calculateMaxTeachingHours(werteinheitenTarget, reductions),
    [werteinheitenTarget, reductions],
  );
  const totalReductions = reductions.reduce((sum, r) => sum + r.werteinheiten, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ employmentPercentage, werteinheitenTarget });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-16 md:pb-0" aria-label="Lehrverpflichtung">
      <div className="space-y-4">
        <div>
          <Label htmlFor="employmentPercentage">Beschäftigungsgrad (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="employmentPercentage"
              type="number"
              min={0}
              max={100}
              value={employmentPercentage}
              onChange={(e) => setEmploymentPercentage(Number(e.target.value))}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label htmlFor="werteinheitenTarget">Werteinheiten-Soll</Label>
          <Input
            id="werteinheitenTarget"
            type="number"
            min={0}
            step={0.1}
            value={werteinheitenTarget}
            onChange={(e) => setWerteinheitenTarget(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Standard: 20 WE für Vollzeit.
          </p>
        </div>

        <InfoBanner>
          Änderungen am Beschäftigungsgrad oder Werteinheiten-Soll wirken sich erst beim nächsten
          Stundenplan-Lauf aus.
        </InfoBanner>

        <div className="hidden md:flex">
          <Button type="submit" disabled={isSaving}>
            Speichern
          </Button>
        </div>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Werteinheiten-Bilanz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Soll</span>
            <span>{werteinheitenTarget.toFixed(1)} WE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ermässigungen</span>
            <span>− {totalReductions.toFixed(1)} WE</span>
          </div>
          <div className="flex justify-between pt-2 border-t font-semibold">
            <span>Effektiv verfügbar</span>
            <span>{effectiveWE.toFixed(1)} WE</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Wert wird live aus <code>calculateMaxTeachingHours</code>
            (<code>@schoolflow/shared</code>) berechnet — identisch mit Server-Seite.
          </p>
        </CardContent>
      </Card>

      <StickyMobileSaveBar
        isDirty
        isSaving={isSaving}
        onSave={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
      />
    </form>
  );
}
