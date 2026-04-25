import { Test } from '@nestjs/testing';
import { SolverInputService } from './solver-input.service';

describe('SolverInputService.processConstraintTemplates', () => {
  it.todo('handles NO_LESSONS_AFTER → classTimeslotRestrictions');
  it.todo('handles SUBJECT_MORNING → subjectTimePreferences');
  it.todo('handles SUBJECT_PREFERRED_SLOT → subjectPreferredSlots (NEW)');
  it.todo('dedupes NO_LESSONS_AFTER per classId, keeps min(maxPeriod)');
  it.todo('dedupes SUBJECT_MORNING per subjectId, keeps min(latestPeriod)');
});
