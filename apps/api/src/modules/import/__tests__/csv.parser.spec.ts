import { describe, it } from 'vitest';

describe('CsvParser', () => {
  // IMPORT-02: CSV parsing
  describe('IMPORT-02: CSV parsing with delimiter detection', () => {
    it.todo('parses comma-delimited CSV');
    it.todo('parses semicolon-delimited CSV (German Excel default)');
    it.todo('parses tab-delimited CSV');
    it.todo('auto-detects delimiter');
    it.todo('handles UTF-8 BOM');
    it.todo('handles Windows-1252 encoded umlauts');
    it.todo('handles quoted fields containing delimiters');
    it.todo('returns headers and data rows separately');
  });
});
