import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import type { StudentDto } from '@/hooks/useStudents';

/**
 * Phase 12-01 StudentStammdatenTab — Tab 1 of the student detail page.
 * Fields: firstName, lastName, email, phone, address, dateOfBirth, SVNR,
 * studentNumber, classId (picker — light list from props), enrollmentDate.
 *
 * RHF + zodResolver would be the ideal pattern, but the existing codebase
 * uses plain React state for StammdatenTab (see Phase 11 teacher tab). We
 * follow that precedent to keep the diff small.
 */

export interface StudentStammdatenFormValues {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  socialSecurityNumber?: string;
  studentNumber?: string;
  classId?: string;
  enrollmentDate?: string;
}

interface Props {
  student?: StudentDto;
  classes?: Array<{ id: string; name: string }>;
  onSave: (values: StudentStammdatenFormValues) => void | Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
  isSaving?: boolean;
}

function emailValid(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function StudentStammdatenTab({
  student,
  classes = [],
  onSave,
  onDirtyChange,
  submitLabel = 'Speichern',
  isSaving = false,
}: Props) {
  const [firstName, setFirstName] = useState(student?.person.firstName ?? '');
  const [lastName, setLastName] = useState(student?.person.lastName ?? '');
  const [email, setEmail] = useState(student?.person.email ?? '');
  const [phone, setPhone] = useState(student?.person.phone ?? '');
  const [address, setAddress] = useState(student?.person.address ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(student?.person.dateOfBirth ?? '');
  const [socialSecurityNumber, setSocialSecurityNumber] = useState(
    student?.person.socialSecurityNumber ?? '',
  );
  const [studentNumber, setStudentNumber] = useState(student?.studentNumber ?? '');
  const [classId, setClassId] = useState(student?.classId ?? '');
  const [enrollmentDate, setEnrollmentDate] = useState(
    student?.enrollmentDate ? student.enrollmentDate.substring(0, 10) : '',
  );
  const [touched, setTouched] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const dirty =
      firstName !== (student?.person.firstName ?? '') ||
      lastName !== (student?.person.lastName ?? '') ||
      email !== (student?.person.email ?? '') ||
      phone !== (student?.person.phone ?? '') ||
      address !== (student?.person.address ?? '') ||
      dateOfBirth !== (student?.person.dateOfBirth ?? '') ||
      socialSecurityNumber !== (student?.person.socialSecurityNumber ?? '') ||
      studentNumber !== (student?.studentNumber ?? '') ||
      classId !== (student?.classId ?? '') ||
      enrollmentDate !==
        (student?.enrollmentDate ? student.enrollmentDate.substring(0, 10) : '');
    setIsDirty(dirty);
    onDirtyChange?.(dirty);
  }, [
    firstName,
    lastName,
    email,
    phone,
    address,
    dateOfBirth,
    socialSecurityNumber,
    studentNumber,
    classId,
    enrollmentDate,
    student,
    onDirtyChange,
  ]);

  const errors = {
    firstName: firstName.trim().length === 0 ? 'Pflichtfeld' : undefined,
    lastName: lastName.trim().length === 0 ? 'Pflichtfeld' : undefined,
    email: email && !emailValid(email) ? 'Gültige E-Mail-Adresse eingeben' : undefined,
  };
  const isValid = !errors.firstName && !errors.lastName && !errors.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    await onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      socialSecurityNumber: socialSecurityNumber.trim() || undefined,
      studentNumber: studentNumber.trim() || undefined,
      classId: classId || undefined,
      enrollmentDate: enrollmentDate || undefined,
    });
  };

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
            required
          />
          {touched && errors.firstName && (
            <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Nachname</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-invalid={!!(touched && errors.lastName)}
            required
          />
          {touched && errors.lastName && (
            <p className="text-sm text-destructive mt-1">{errors.lastName}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!(touched && errors.email)}
          />
          {touched && errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Geburtsdatum</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="socialSecurityNumber">SVNR</Label>
          <Input
            id="socialSecurityNumber"
            value={socialSecurityNumber}
            onChange={(e) => setSocialSecurityNumber(e.target.value)}
            placeholder="10-stellig"
          />
        </div>
        <div>
          <Label htmlFor="studentNumber">Schüler-Nr.</Label>
          <Input
            id="studentNumber"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="classId">Stammklasse</Label>
          <select
            id="classId"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="">Ohne Stammklasse</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="enrollmentDate">Eintrittsdatum</Label>
          <Input
            id="enrollmentDate"
            type="date"
            value={enrollmentDate}
            onChange={(e) => setEnrollmentDate(e.target.value)}
          />
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
    </form>
  );
}
