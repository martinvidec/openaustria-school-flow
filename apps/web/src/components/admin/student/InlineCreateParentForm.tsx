import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateParent, useLinkParentToStudent } from '@/hooks/useParents';

interface Props {
  schoolId: string;
  studentId: string;
  /** Pre-fill email from the search query when 404 → inline-create. */
  initialEmail?: string;
  onCancel: () => void;
  onCreated: () => void;
}

function emailValid(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function InlineCreateParentForm({
  schoolId,
  studentId,
  initialEmail = '',
  onCancel,
  onCreated,
}: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createMutation = useCreateParent(schoolId);
  const linkMutation = useLinkParentToStudent(studentId);

  const errors = {
    firstName: firstName.trim().length === 0 ? 'Pflichtfeld' : undefined,
    lastName: lastName.trim().length === 0 ? 'Pflichtfeld' : undefined,
    email: !email
      ? 'Pflichtfeld'
      : !emailValid(email)
        ? 'Gültige E-Mail-Adresse eingeben'
        : undefined,
  };
  const isValid = !errors.firstName && !errors.lastName && !errors.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setIsSaving(true);
    try {
      const parent = await createMutation.mutateAsync({
        schoolId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      if (parent?.id) {
        await linkMutation.mutateAsync(parent.id);
      }
      onCreated();
    } catch {
      // toasts already surfaced by the hook onError handlers
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Erziehungsberechtigte:n anlegen">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="parent-firstName">Vorname</Label>
          <Input
            id="parent-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          {touched && errors.firstName && (
            <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <Label htmlFor="parent-lastName">Nachname</Label>
          <Input
            id="parent-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          {touched && errors.lastName && (
            <p className="text-sm text-destructive mt-1">{errors.lastName}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="parent-email">E-Mail</Label>
          <Input
            id="parent-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {touched && errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="parent-phone">Telefon (optional)</Label>
          <Input
            id="parent-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+43 1 …"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          Zurück
        </Button>
        <Button type="submit" disabled={isSaving || !isValid}>
          Anlegen & verknüpfen
        </Button>
      </div>
    </form>
  );
}
