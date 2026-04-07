import { describe, it, expect } from 'vitest';
import { parseCsv } from '../parsers/csv.parser';

describe('CsvParser', () => {
  // IMPORT-02: CSV parsing
  describe('IMPORT-02: CSV parsing with delimiter detection', () => {
    it('parses comma-delimited CSV', () => {
      const content = `Name,Vorname,Klasse
Mueller,Maria,1A
Schmidt,Hans,2B`;

      const result = parseCsv(content);
      expect(result.headers).toEqual(['Name', 'Vorname', 'Klasse']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(['Mueller', 'Maria', '1A']);
      expect(result.detectedDelimiter).toBe(',');
    });

    it('parses semicolon-delimited CSV (German Excel default)', () => {
      const content = `Name;Vorname;Klasse
Mueller;Maria;1A
Schmidt;Hans;2B`;

      const result = parseCsv(content);
      expect(result.headers).toEqual(['Name', 'Vorname', 'Klasse']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(['Mueller', 'Maria', '1A']);
      expect(result.detectedDelimiter).toBe(';');
    });

    it('parses tab-delimited CSV', () => {
      const content = `Name\tVorname\tKlasse
Mueller\tMaria\t1A`;

      const result = parseCsv(content);
      expect(result.headers).toEqual(['Name', 'Vorname', 'Klasse']);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(['Mueller', 'Maria', '1A']);
      expect(result.detectedDelimiter).toBe('\t');
    });

    it('auto-detects delimiter', () => {
      const commaContent = `a,b,c\n1,2,3`;
      const semiContent = `a;b;c\n1;2;3`;
      const tabContent = `a\tb\tc\n1\t2\t3`;

      expect(parseCsv(commaContent).detectedDelimiter).toBe(',');
      expect(parseCsv(semiContent).detectedDelimiter).toBe(';');
      expect(parseCsv(tabContent).detectedDelimiter).toBe('\t');
    });

    it('handles UTF-8 BOM', () => {
      const content = `\uFEFFName,Vorname
Mueller,Maria`;

      const result = parseCsv(content);
      expect(result.headers).toEqual(['Name', 'Vorname']);
      expect(result.headers[0]).not.toContain('\uFEFF');
    });

    it('handles Windows-1252 encoded umlauts', () => {
      // In UTF-8, umlauts should parse fine
      const content = `Name,Vorname
Mller,Maria
Fhrer,Anna`;

      const result = parseCsv(content);
      expect(result.data).toHaveLength(2);
      expect(result.data[0][0]).toBe('Mller');
    });

    it('handles quoted fields containing delimiters', () => {
      const content = `Name,Beschreibung,Klasse
"Mueller, Maria","Lehrerin, Mathe",1A
Schmidt,Lehrer,2B`;

      const result = parseCsv(content);
      expect(result.data).toHaveLength(2);
      expect(result.data[0][0]).toBe('Mueller, Maria');
      expect(result.data[0][1]).toBe('Lehrerin, Mathe');
    });

    it('returns headers and data rows separately', () => {
      const content = `A,B,C
1,2,3
4,5,6
7,8,9`;

      const result = parseCsv(content);
      expect(result.headers).toEqual(['A', 'B', 'C']);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual(['1', '2', '3']);
      expect(result.data[2]).toEqual(['7', '8', '9']);
    });

    it('accepts explicit delimiter override', () => {
      const content = `Name|Vorname|Klasse
Mueller|Maria|1A`;

      const result = parseCsv(content, '|');
      expect(result.headers).toEqual(['Name', 'Vorname', 'Klasse']);
      expect(result.data[0]).toEqual(['Mueller', 'Maria', '1A']);
      expect(result.detectedDelimiter).toBe('|');
    });
  });
});
