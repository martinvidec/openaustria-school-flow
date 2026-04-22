import { describe, it } from 'vitest';

describe('StammdatenTab', () => {
  it.todo('renders Stammdaten form fields in order Vorname/Nachname/Titel/Email/Phone/Status');
  it.todo('blocks submit when email is invalid via RHF zodResolver');
  it.todo('fires onSave with validated values (englische API-Feldnamen)');
});
