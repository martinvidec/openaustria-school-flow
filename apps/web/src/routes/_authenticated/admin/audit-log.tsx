import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useAuth } from '@/hooks/useAuth';

/**
 * Phase 15-05: /admin/audit-log route shell.
 *
 * Plan 15-05 (this plan) ships only the route shell + admin gate +
 * URL search-param contract. Filter toolbar + table + drawer + JsonTree
 * land in plan 15-09.
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
      <div
        data-audit-log-placeholder="15-09"
        className="rounded-md border border-dashed p-8 text-sm text-muted-foreground"
      >
        <p className="font-semibold text-foreground">Audit-Log Viewer</p>
        <p>
          Wird in Plan 15-09 ausgeliefert (Filter-Toolbar, Tabelle,
          Detail-Drawer, JSON-Baum, CSV-Export-Button).
        </p>
      </div>
    </PageShell>
  );
}
