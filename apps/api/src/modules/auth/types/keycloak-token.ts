export interface KeycloakTokenPayload {
  sub: string;
  email: string;
  preferred_username: string;
  email_verified: boolean;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  iat: number;
  exp: number;
  iss: string;
  aud: string | string[];
}
