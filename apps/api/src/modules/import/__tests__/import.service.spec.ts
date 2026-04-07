import { describe, it } from 'vitest';

describe('ImportService', () => {
  // IMPORT-01: Untis XML/DIF import
  describe('IMPORT-01: Untis import', () => {
    it.todo('creates ImportJob in QUEUED status');
    it.todo('transitions to DRY_RUN status on dry-run');
    it.todo('transitions to PROCESSING on commit');
    it.todo('transitions to COMPLETED on success');
    it.todo('transitions to PARTIAL when some rows skipped');
    it.todo('transitions to FAILED on complete failure');
    it.todo('stores import results (imported, skipped, error counts)');
    it.todo('creates import history for audit trail (D-08)');
  });

  // IMPORT-02: CSV import with column mapping
  describe('IMPORT-02: CSV import', () => {
    it.todo('accepts column mapping configuration');
    it.todo('validates required fields are mapped');
    it.todo('processes rows with SKIP conflict mode');
    it.todo('processes rows with UPDATE conflict mode');
    it.todo('processes rows with FAIL conflict mode');
  });
});
