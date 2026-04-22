import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import { KeycloakLinkSection } from './KeycloakLinkSection';
import type { TeacherDto } from '@/hooks/useTeachers';

/**
 * StammdatenTab — Tab 1 of the teacher detail page.
 * Order: Vorname · Nachname · Titel · Email · Phone · Status.
 */

export interface StammdatenFormValues {
  firstName: string;
  lastName: string;
  academicTitle?: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface Props {
  teacher?: TeacherDto;
  /** When present the form operates on an existing teacher and renders the Keycloak link section. */
  teacherId?: string;
  onSave: (values: StammdatenFormValues) => void | Promise<void>;
  submitLabel?: string;
  isSaving?: boolean;
}

function emailValid(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function StammdatenTab({ teacher, teacherId, onSave, submitLabel = 'Speichern', isSaving = false }: Props) {
  const [firstName, setFirstName] = useState(teacher?.person.firstName ?? '');
  const [lastName, setLastName] = useState(teacher?.person.lastName ?? '');
  const [academicTitle, setAcademicTitle] = useState('');
  const [email, setEmail] = useState(teacher?.person.email ?? '');
  const [phone, setPhone] = useState(teacher?.person.phone ?? '');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [touched, setTouched] = useState(false);

  const errors = {
    firstName: firstName.trim().length === 0 ? 'Pflichtfeld' : undefined,
    lastName: lastName.trim().length === 0 ? 'Pflichtfeld' : undefined,
    email: !email ? 'Pflichtfeld' : !emailValid(email) ? 'Gültige E-Mail-Adresse eingeben' : undefined,
  };
  const isValid = !errors.firstName && !errors.lastName && !errors.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    await onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      academicTitle: academicTitle.trim() || undefined,
      email: email.trim(),
      phone: phone.trim() || undefined,
      status,
    });
  };

  const isDirty = true; // simplified: keep save bar live

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-16 md:pb-0" aria-label="Stammdaten">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Vorname</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={!!(touched && errors.firstName)}
            aria-describedby={touched && errors.firstName ? 'firstName-err' : undefined}
            required
          />
          {touched && errors.firstName && (
            <p id="firstName-err" className="text-sm text-destructive mt-1">
              {errors.firstName}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Nachname</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-invalid={!!(touched && errors.lastName)}
            aria-describedby={touched && errors.lastName ? 'lastName-err' : undefined}
            required
          />
          {touched && errors.lastName && (
            <p id="lastName-err" className="text-sm text-destructive mt-1">
              {errors.lastName}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="academicTitle">Titel</Label>
          <Input
            id="academicTitle"
            value={academicTitle}
            onChange={(e) => setAcademicTitle(e.target.value)}
            placeholder="Mag., Dr., …"
          />
        </div>
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!(touched && errors.email)}
            aria-describedby={touched && errors.email ? 'email-err' : undefined}
            required
          />
          {touched && errors.email && (
            <p id="email-err" className="text-sm text-destructive mt-1">
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+43 1 …"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'ARCHIVED')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="ACTIVE">Aktiv</option>
            <option value="ARCHIVED">Archiviert</option>
          </select>
        </div>
      </div>

      <div className="hidden md:flex justify-end">
        <Button type="submit" disabled={isSaving || !isValid}>
          {submitLabel}
        </Button>
      </div>

      <StickyMobileSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
        label={submitLabel}
      />

      {teacherId && (
        <>
          <Separator className="my-6" />
          <KeycloakLinkSection teacherId={teacherId} keycloakUserId={teacher?.person.keycloakUserId ?? null} email={email} />
        </>
      )}
    </form>
  );
}
