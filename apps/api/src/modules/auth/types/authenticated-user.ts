export interface AuthenticatedUser {
  id: string; // Keycloak sub (UUID)
  email: string;
  username: string;
  roles: string[]; // Merged realm + client roles
}
