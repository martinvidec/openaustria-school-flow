import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { SchoolYearSchema, type SchoolYearInput } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Props {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (dto: SchoolYearInput) => void;
}

export function CreateSchoolYearDialog({ open, isSubmitting, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<SchoolYearInput>({
    resolver: zodResolver(SchoolYearSchema),
    defaultValues: { name: '', isActive: false } as Partial<SchoolYearInput>,
  });

  // Reset on close so the next open starts clean.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const isActive = watch('isActive');

  const submit = handleSubmit((v) => {
    onSubmit(v);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Schuljahr anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sy-name">Name</Label>
            <Input id="sy-name" {...register('name')} placeholder="2026/2027" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sy-start">Start</Label>
            <Input id="sy-start" type="date" {...register('startDate', { valueAsDate: true })} />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate.message as string}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sy-sem">Semesterwechsel</Label>
            <Input
              id="sy-sem"
              type="date"
              {...register('semesterBreak', { valueAsDate: true })}
            />
            {errors.semesterBreak && (
              <p className="text-xs text-destructive">{errors.semesterBreak.message as string}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sy-end">Ende</Label>
            <Input id="sy-end" type="date" {...register('endDate', { valueAsDate: true })} />
            {errors.endDate && (
              <p className="text-xs text-destructive">{errors.endDate.message as string}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sy-active">Als aktives Schuljahr setzen</Label>
            <Switch
              id="sy-active"
              checked={!!isActive}
              onCheckedChange={(v) => setValue('isActive', v, { shouldDirty: true })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird angelegt...' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
