export enum Role {
  ADMIN = 'admin',
  SCHULLEITUNG = 'schulleitung',
  LEHRER = 'lehrer',
  ELTERN = 'eltern',
  SCHUELER = 'schueler',
}

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.SCHULLEITUNG]: 'Schulleitung',
  [Role.LEHRER]: 'Lehrer',
  [Role.ELTERN]: 'Eltern',
  [Role.SCHUELER]: 'Schueler',
};
