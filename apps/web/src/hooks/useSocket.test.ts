import { describe, it } from 'vitest';

describe('useTimetableSocket', () => {
  describe('VIEW-04: Real-time updates', () => {
    it.todo('connects to /timetable namespace with schoolId');
    it.todo('invalidates timetable queries on timetable:changed event');
    it.todo('shows toast notification on timetable change');
    it.todo('handles connection loss with reconnection toast');
  });

  describe('ROOM-05: Room change propagation', () => {
    it.todo('invalidates room availability queries on timetable:room-swap event');
    it.todo('shows room change toast on timetable:room-swap event');
  });
});
