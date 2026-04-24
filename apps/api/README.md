# SchoolFlow API

NestJS 11 backend for OpenAustria SchoolFlow.

## Quick start

See repo-root `README.md` for the full Docker + dev-server bring-up. This
file documents API-specific operational concerns.

## Keycloak service-account required roles

The API talks to Keycloak's admin REST endpoints via a service-account
client (client-credentials grant). The client is configured via env vars
`KEYCLOAK_ADMIN_CLIENT_ID` and `KEYCLOAK_ADMIN_CLIENT_SECRET`.

The service-account user MUST have the following client roles assigned
(under `realm-management`):

| Client role     | Used for                                                  |
| --------------- | --------------------------------------------------------- |
| `view-users`    | `findUsersByEmail`, `findUsers`, `findUserById` (read)    |
| `manage-users`  | `setEnabled`, `addRealmRoleMappings`, `delRealmRoleMappings` (write) |
| `view-realm`    | `findRealmRoleByName` (resolve realm-role IDs)            |
| `query-users`   | (optional) needed in some KC builds for `users.count`     |

### How to assign

In the Keycloak admin UI:

1. Navigate to **Clients → {KEYCLOAK_ADMIN_CLIENT_ID} → Service Account Roles**.
2. Open the **Client Roles** dropdown and select `realm-management`.
3. Move `view-users`, `manage-users`, and `view-realm` from "Available
   Roles" to "Assigned Roles".
4. (Optional) If your deployment returns 403 from `/users/count`, also
   assign `query-users`.

If any of these are missing the API will surface 5xx errors when admins
hit `GET /admin/users` or `PUT /admin/users/:id/roles`. The error
message in the API log starts with `Failed to authenticate against
Keycloak admin API` (auth failure) or includes a Keycloak-side 403
payload (permission failure).

## Migrations

See `prisma/README.md` for the no-`prisma db push` policy.

After running `pnpm --filter @schoolflow/api exec prisma migrate dev`,
restart the long-running API process — see
`memory/feedback_restart_api_after_migration.md` for the exact steps
on Node 25 + ESM shared package.
