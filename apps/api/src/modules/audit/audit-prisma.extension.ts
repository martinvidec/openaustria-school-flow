/**
 * Prisma client extension for setting user context on database connections.
 * Used by PostgreSQL audit triggers to know who made the change.
 *
 * NOTE: Phase 1 uses HTTP-level interceptor for audit logging instead of
 * database triggers to avoid transaction overhead (see Pitfall 7 in research).
 * This extension is prepared for Phase 2+ when DB-level audit triggers
 * may be needed for DSGVO compliance.
 */
export function createAuditExtension(
  getCurrentUserId: () => string | null,
) {
  return {
    name: 'audit-context',
    query: {
      async $allOperations({
        args,
        query,
        operation,
      }: {
        args: any;
        query: (args: any) => Promise<any>;
        operation: string;
      }) {
        const userId = getCurrentUserId();
        if (
          userId &&
          ['create', 'update', 'delete', 'upsert'].includes(operation)
        ) {
          // Future: set PostgreSQL session variable for DB trigger
          // await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
        }
        return query(args);
      },
    },
  };
}
