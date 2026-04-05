import { describe, it } from 'vitest';

describe('TimetableService.getView overlay behavior (SUBST-05)', () => {
  it.todo('when query.date is provided, joins Substitution rows matching (lessonId, date)');
  it.todo(
    'SUBSTITUTED overlay populates changeType=substitution, originalTeacherSurname=<absent lastName>, teacherId=<substitute id>',
  );
  it.todo(
    'ENTFALL overlay populates changeType=cancelled, preserves original teacher fields (rendered as strikethrough)',
  );
  it.todo(
    'STILLARBEIT overlay populates changeType=stillarbeit (new wire value), substitute teacher shown as supervisor',
  );
  it.todo('when query.date is omitted, returns recurring plan without overlays (backward compatible)');
  it.todo(
    'overlay only applied for Substitution rows with status IN (CONFIRMED, OFFERED); PENDING rows are ignored',
  );
  it.todo(
    'substituteRoomId override populates roomId/roomName and composes with substitution changeType',
  );
  it.todo(
    'emits timetable:substitution or timetable:cancelled on /timetable gateway when Substitution transitions to CONFIRMED',
  );
});
