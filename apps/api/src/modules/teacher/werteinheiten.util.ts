/**
 * Werteinheiten util re-exported from @schoolflow/shared.
 *
 * The implementation was moved to `packages/shared/src/werteinheiten/` in
 * Phase 11-01 so both backend and frontend compute Werteinheiten identically
 * (D-05 — FE/BE byte-identical). Import path preserved for existing consumers
 * (`teacher.service.ts`).
 */
export {
  calculateWerteinheiten,
  calculateMaxTeachingHours,
  LEHRVERPFLICHTUNGSGRUPPEN,
  type LehrverpflichtungsgruppeConfig,
} from '@schoolflow/shared';
