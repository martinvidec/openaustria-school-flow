import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useAuth } from '@/hooks/useAuth';
import { AuditFilterToolbar } from '@/components/admin/audit-log/AuditFilterToolbar';
import { AuditTable } from '@/components/admin/audit-log/AuditTable';

/**
 * Phase 15-05 + 15-09: /admin/audit-log route.
 *
 * 15-05 shipped the route shell + admin gate + Zod search-param contract.
 * 15-09 wires the filter toolbar + table + drawer + JsonTree.
 *
 * Strict admin-only per D-22 + D-03 (T-15-05-02 mitigation, mirrors
 * solver-tuning.tsx + dsgvo.tsx).
 */

const AuditLogSearchSchema = z.object({
  // YYYY-MM-DD format — native <Input type="date"> emits this and plan 15-09
  // toolbar consumes it directly. ISO datetime would require a transform
  // before binding to the date input.
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  action: z.enum(['create', 'update', 'delete', 'read']).optional(),
  resource: z.string().max(64).optional(),
  userId: z.string().max(64).optional(),
  category: z.enum(['MUTATION', 'SENSITIVE_READ']).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute('/_authenticated/admin/audit-log')({
  validateSearch: AuditLogSearchSchema,
  component: AuditLogPage,
});

function AuditLogPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const isAdmin = (user?.roles ?? []).includes('admin');

  if (!isAdmin) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Verwaltung', href: '/admin/school/settings' },
          { label: 'Audit-Log' },
        ]}
        title="Audit-Log"
      >
        <p className="text-sm text-muted-foreground">
          Du bist für diese Seite nicht autorisiert.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Verwaltung', href: '/admin/school/settings' },
        { label: 'Audit-Log' },
      ]}
      title="Audit-Log"
      subtitle="Sämtliche protokollierten Aktionen durchsuchen, einsehen und für DSGVO-Berichte exportieren."
    >
      <div className="space-y-6">
        <AuditFilterToolbar />
        <AuditTable filters={search} />
      </div>
    </PageShell>
  );
}
