import { describe, it } from 'vitest';

describe('CalendarService', () => {
  // IMPORT-03: iCal/ICS export
  describe('IMPORT-03: iCal calendar generation', () => {
    it.todo('generates CalendarToken with UUID');
    it.todo('generates valid ICS content with timetable lessons');
    it.todo('includes homework due dates as all-day events');
    it.todo('includes exam dates as all-day events');
    it.todo('uses Europe/Vienna timezone');
    it.todo('revokes token and generates new one');
    it.todo('returns 404 for invalid/revoked token');
  });
});
