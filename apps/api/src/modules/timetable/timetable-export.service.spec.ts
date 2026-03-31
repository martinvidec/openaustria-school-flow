import { describe, it } from 'vitest';

describe('TimetableExportService', () => {
  describe('VIEW-06: PDF export', () => {
    it.todo('generates a PDF buffer for teacher perspective');
    it.todo('includes school name and perspective name in title');
    it.todo('includes all lessons in grid layout');
  });

  describe('VIEW-06: iCal export', () => {
    it.todo('generates valid iCal string with VCALENDAR');
    it.todo('creates recurring events for each lesson');
    it.todo('uses Europe/Vienna timezone');
    it.todo('handles A/B week with INTERVAL=2');
  });
});
