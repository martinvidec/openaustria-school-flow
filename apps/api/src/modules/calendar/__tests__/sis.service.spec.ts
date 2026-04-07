import { describe, it } from 'vitest';

describe('SisService', () => {
  // IMPORT-04: SIS read-only API
  describe('IMPORT-04: SIS API with API key auth', () => {
    it.todo('creates SisApiKey with UUID key');
    it.todo('returns students for a school');
    it.todo('returns teachers for a school');
    it.todo('returns classes for a school');
    it.todo('rejects request without X-Api-Key header');
    it.todo('rejects request with inactive API key');
    it.todo('deactivates API key on revoke');
    it.todo('updates lastUsed timestamp on successful request');
  });
});
