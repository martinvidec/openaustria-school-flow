import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { buildAuditQueryString, type AuditFilters } from './useAuditEntries';

/**
 * Phase 15-09 hook: imperative CSV download from
 * `GET /api/v1/audit/export.csv?…` (plan 15-02 endpoint — server-side
 * Papa.unparse + UTF-8 BOM + semicolon delimiter, capped at 10,000 rows).
 *
 * Response handling:
 *   - 4xx/5xx → throws → toast.error('CSV-Export fehlgeschlagen.') per
 *     UI-SPEC § Error states. NO success toast on 200 — the browser's own
 *     download UI is the success signal.
 *   - 200 → reads `Content-Disposition` filename, falls back to
 *     `audit-log-YYYY-MM-DD.csv`, creates a synthetic `<a download>`,
 *     clicks it, then revokes the blob URL via `setTimeout(...,0)` so
 *     the click handler completes first. The BOM survives this path because
 *     `res.blob()` preserves the byte stream verbatim (T-15-09-07
 *     mitigation: blob URL revoked).
 *
 * Reading the body via `res.text()` would risk the BOM being normalized
 * by some browsers — DO NOT do that.
 */

function defaultFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `audit-log-${y}-${m}-${day}.csv`;
}

function parseFilename(disposition: string | null): string {
  if (!disposition) return defaultFilename();
  const m = /filename="?([^";]+)/i.exec(disposition);
  return m ? m[1] : defaultFilename();
}

export function useAuditCsvExport() {
  const m = useMutation({
    mutationFn: async (filters: AuditFilters): Promise<void> => {
      const qs = buildAuditQueryString(filters);
      const res = await apiFetch(`/api/v1/audit/export.csv?${qs}`);
      if (!res.ok) {
        throw new Error(`CSV export failed: ${res.status}`);
      }
      const filename = parseFilename(res.headers.get('Content-Disposition'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    onError: () => {
      toast.error('CSV-Export fehlgeschlagen.');
    },
  });

  return {
    download: (filters: AuditFilters) => m.mutateAsync(filters),
    isPending: m.isPending,
    error: m.error,
  };
}
