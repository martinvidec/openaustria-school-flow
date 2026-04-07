import { describe, it } from 'vitest';

describe('UntisParser', () => {
  // IMPORT-01: Untis XML parsing
  describe('IMPORT-01: Untis XML parsing', () => {
    it.todo('parses teachers from Untis XML');
    it.todo('parses classes from Untis XML');
    it.todo('parses rooms from Untis XML');
    it.todo('parses lessons from Untis XML');
    it.todo('handles missing optional fields gracefully');
  });

  // IMPORT-01: Untis DIF parsing
  describe('IMPORT-01: Untis DIF parsing', () => {
    it.todo('parses GPU004 teachers DIF');
    it.todo('parses GPU003 classes DIF');
    it.todo('parses GPU005 rooms DIF');
    it.todo('parses GPU002 lessons DIF');
    it.todo('auto-detects delimiter in DIF files');
    it.todo('ignores extra trailing fields');
  });
});
