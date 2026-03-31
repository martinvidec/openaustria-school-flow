import { describe, it } from 'vitest';

describe('TimetableGrid', () => {
  describe('VIEW-01: Teacher timetable view', () => {
    it.todo('renders a CSS grid with period rows and day columns');
    it.todo('displays lesson cells with subject abbreviation, teacher surname, room name');
    it.todo('renders break rows between periods with muted background');
    it.todo('merges consecutive same-subject periods into Doppelstunde cells');
  });

  describe('VIEW-02: Class timetable view', () => {
    it.todo('renders class perspective when perspective prop is "class"');
    it.todo('shows all lessons for the class regardless of teacher');
  });
});
