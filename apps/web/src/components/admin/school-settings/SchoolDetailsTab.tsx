import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SCHOOL_TYPES, SchoolDetailsSchema, type SchoolDetailsInput } from '@schoolflow/shared';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSchool, useFirstSchool, useSchool, useUpdateSchool } from '@/hooks/useSchool';
import { useSchoolContext } from '@/stores/school-context-store';

// Austrian Schultyp labels per UI-SPEC §3.2. Mirrors SCHOOL_TYPES in the shared package.
const SCHOOL_TYPE_LABELS: Record<(typeof SCHOOL_TYPES)[number], string> = {
  VS: 'Volksschule',
  NMS: 'Neue Mittelschule',
  AHS: 'Allgemeinbildende hoehere Schule',
  BHS: 'Berufsbildende hoehere Schule',
  BMS: 'Berufsbildende mittlere Schule',
  PTS: 'Polytechnische Schule',
  ASO: 'Allgemeine Sonderschule',
};

interface Props {
  onDirtyChange?: (d: boolean) => void;
}

export function SchoolDetailsTab({ onDirtyChange }: Props) {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const setContext = useSchoolContext((s) => s.setContext);
  const firstSchoolQuery = useFirstSchool();
  const schoolQuery = useSchool(schoolId ?? undefined);

  // Empty-flow bootstrap: if no schoolId in the store but a school exists on
  // the server, hydrate. Runs once on mount; downstream tabs (2-4) gate on
  // schoolId so the order matters (RESEARCH §8 "Zustand empty-flow timing").
  useEffect(() => {
    if (!schoolId && firstSchoolQuery.data) {
      setContext({
        schoolId: firstSchoolQuery.data.id,
        personType: 'admin',
        abWeekEnabled: firstSchoolQuery.data.abWeekEnabled ?? false,
      });
    }
  }, [schoolId, firstSchoolQuery.data, setContext]);

  const isEmpty = !schoolId && firstSchoolQuery.isFetched && !firstSchoolQuery.data;
  const school = schoolQuery.data ?? null;

  const form = useForm<SchoolDetailsInput>({
    resolver: zodResolver(SchoolDetailsSchema),
    defaultValues: {
      name: school?.name ?? '',
      schoolType: (school?.schoolType ?? 'AHS') as SchoolDetailsInput['schoolType'],
      address: {
        street: school?.address?.street ?? '',
        zip: school?.address?.zip ?? '',
        city: school?.address?.city ?? '',
      },
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = form;

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  // Dirty-Reset Discipline (RESEARCH §8): when the server response lands,
  // reset the form so isDirty returns to false. Without this, the Save button
  // stays enabled after a successful save.
  useEffect(() => {
    if (school) {
      reset({
        name: school.name,
        schoolType: school.schoolType,
        address: school.address,
      });
    }
  }, [school, reset]);

  const createMut = useCreateSchool();
  const updateMut = useUpdateSchool(schoolId ?? '');
  const isSaving = createMut.isPending || updateMut.isPending;

  const onSubmit = handleSubmit(async (values) => {
    if (isEmpty) {
      const created = await createMut.mutateAsync(values);
      // Set Zustand BEFORE reset so the next render sees schoolId and tabs
      // 2-4 enable immediately (RESEARCH §8 "Zustand empty-flow timing").
      setContext({
        schoolId: created.id,
        personType: 'admin',
        abWeekEnabled: created.abWeekEnabled ?? false,
      });
      reset({
        name: created.name,
        schoolType: created.schoolType,
        address: created.address,
      });
    } else if (schoolId) {
      const updated = await updateMut.mutateAsync(values);
      reset({
        name: updated.name,
        schoolType: updated.schoolType,
        address: updated.address,
      });
    }
  });

  return (
    <Card className="border-none shadow-none md:border md:shadow-sm p-6 md:p-8">
      {isEmpty && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden />
          <h2 className="text-lg font-semibold mb-2">Noch keine Schule angelegt</h2>
          <p className="text-sm text-muted-foreground">
            Legen Sie zuerst die Stammdaten Ihrer Schule an. Anschliessend koennen Sie
            Zeitraster, Schuljahre und Optionen konfigurieren.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Stammdaten</h2>
        <p className="text-sm text-muted-foreground">Name, Schultyp und Adresse der Schule.</p>

        <div className="space-y-1.5">
          <Label htmlFor="name">Schulname *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="z. B. BG/BRG Wien Gymnasium Rahlgasse"
            className="h-11 md:h-10"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-msg' : undefined}
            disabled={isSaving}
          />
          {errors.name && (
            <p id="name-msg" className="text-xs text-destructive mt-1.5">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="schoolType">Schultyp *</Label>
          <Controller
            control={control}
            name="schoolType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isSaving}>
                <SelectTrigger id="schoolType" className="h-11 md:h-10">
                  <SelectValue placeholder="Schultyp auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SCHOOL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.schoolType && (
            <p className="text-xs text-destructive mt-1.5">{errors.schoolType.message}</p>
          )}
        </div>

        <p className="text-sm font-medium mt-4 text-muted-foreground">Adresse</p>
        <div className="space-y-1.5">
          <Label htmlFor="street">Strasse *</Label>
          <Input
            id="street"
            {...register('address.street')}
            className="h-11 md:h-10"
            aria-invalid={!!errors.address?.street}
            disabled={isSaving}
          />
          {errors.address?.street && (
            <p className="text-xs text-destructive mt-1.5">{errors.address.street.message}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-1.5">
            <Label htmlFor="zip">PLZ *</Label>
            <Input
              id="zip"
              {...register('address.zip')}
              placeholder="1010"
              className="h-11 md:h-10"
              aria-invalid={!!errors.address?.zip}
              disabled={isSaving}
            />
            {errors.address?.zip && (
              <p className="text-xs text-destructive mt-1.5">{errors.address.zip.message}</p>
            )}
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="city">Ort *</Label>
            <Input
              id="city"
              {...register('address.city')}
              className="h-11 md:h-10"
              aria-invalid={!!errors.address?.city}
              disabled={isSaving}
            />
            {errors.address?.city && (
              <p className="text-xs text-destructive mt-1.5">{errors.address.city.message}</p>
            )}
          </div>
        </div>

        {/* Desktop save button */}
        <div className="hidden md:flex justify-end mt-6">
          <Button type="submit" disabled={!isDirty || isSaving} className="min-w-[8rem]">
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEmpty ? 'Schule anlegen' : 'Speichern'}
          </Button>
        </div>
      </form>

      {/* Mobile sticky save bar */}
      <StickyMobileSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => void onSubmit()}
        label={isEmpty ? 'Schule anlegen' : 'Speichern'}
      />
    </Card>
  );
}
