import Keycloak from 'keycloak-js';

const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080';
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM ?? 'schoolflow';
const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'schoolflow-web';

export const keycloak = new Keycloak({
  url: keycloakUrl,
  realm: keycloakRealm,
  clientId: keycloakClientId,
});

export async function initKeycloak(): Promise<boolean> {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri:
        window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
    });
    return authenticated;
  } catch (error) {
    console.error('Keycloak init failed:', error);
    return false;
  }
}
