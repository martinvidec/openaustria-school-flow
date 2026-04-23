/**
 * AUSTRIAN_STUNDENTAFELN moved to @schoolflow/shared in Phase 11 Plan 11-02.
 *
 * This module now exists only as a re-export shim so existing apps/api
 * callers (stundentafel-template.service.ts) keep working without touching
 * their import paths. See packages/shared/src/stundentafel/ for the
 * canonical source of the Austrian Stundentafel templates.
 */
export { AUSTRIAN_STUNDENTAFELN, type StundentafelTemplate } from '@schoolflow/shared';
