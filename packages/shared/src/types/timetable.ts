/** Represents a lesson as returned by the timetable view API */
export interface TimetableViewLesson {
  id: string;
  classSubjectId: string;
  subjectId: string;
  subjectAbbreviation: string;
  subjectName: string;
  teacherId: string;
  teacherSurname: string;
  roomId: string;
  roomName: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  isManualEdit: boolean;
  changeType?: 'substitution' | 'cancelled' | 'room-swap' | 'stillarbeit' | null;
  originalTeacherSurname?: string;
  originalRoomName?: string;
}

/** Day of week enum matching Prisma DayOfWeek */
export type DayOfWeekType = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

/** Period info from TimeGrid */
export interface PeriodInfo {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  label: string | null;
  durationMin: number;
}

/** Complete timetable view response */
export interface TimetableViewResponse {
  schoolId: string;
  runId: string;
  perspective: 'teacher' | 'class' | 'room';
  perspectiveId: string;
  perspectiveName: string;
  abWeekEnabled: boolean;
  periods: PeriodInfo[];
  activeDays: DayOfWeekType[];
  lessons: TimetableViewLesson[];
}

/** Constraint violation from move validation */
export interface ConstraintViolation {
  type: string;
  description: string;
}

/** Soft constraint warning with weight */
export interface ConstraintWarning {
  type: string;
  description: string;
  weight: number;
}

/** Response from POST validate-move endpoint */
export interface MoveValidation {
  valid: boolean;
  hardViolations: ConstraintViolation[];
  softWarnings: ConstraintWarning[];
}

/** Request body for validate-move and move-lesson */
export interface MoveLessonRequest {
  lessonId: string;
  targetDay: string;
  targetPeriod: number;
  targetRoomId?: string;
}

/** Edit history record */
export interface TimetableLessonEditRecord {
  id: string;
  lessonId: string;
  runId: string;
  editedBy: string;
  editedByName?: string;
  editAction: 'move' | 'swap' | 'cancel' | 'revert';
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  createdAt: string;
}

/** Subject color pair for timetable rendering */
export interface SubjectColorPair {
  bg: string;
  text: string;
}

/** Subject color palette -- 15 WCAG AA-compliant color pairs */
export const SUBJECT_PALETTE: readonly SubjectColorPair[] = [
  { bg: '#DBEAFE', text: '#1E40AF' },  // Blue
  { bg: '#FEF3C7', text: '#92400E' },  // Amber
  { bg: '#D1FAE5', text: '#065F46' },  // Emerald
  { bg: '#FCE7F3', text: '#9D174D' },  // Pink
  { bg: '#E0E7FF', text: '#3730A3' },  // Indigo
  { bg: '#FED7AA', text: '#9A3412' },  // Orange
  { bg: '#CCFBF1', text: '#134E4A' },  // Teal
  { bg: '#F3E8FF', text: '#6B21A8' },  // Purple
  { bg: '#FEE2E2', text: '#991B1B' },  // Red
  { bg: '#ECFCCB', text: '#3F6212' },  // Lime
  { bg: '#E0F2FE', text: '#075985' },  // Sky
  { bg: '#FECDD3', text: '#9F1239' },  // Rose
  { bg: '#D9F99D', text: '#365314' },  // Light Green
  { bg: '#FDE68A', text: '#78350F' },  // Yellow
  { bg: '#C7D2FE', text: '#4338CA' },  // Violet
] as const;

/** Get subject color by deterministic hash of subject ID */
export function getSubjectColor(subjectId: string): SubjectColorPair {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash = ((hash << 5) - hash) + subjectId.charCodeAt(i);
    hash |= 0;
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

/** WebSocket event payloads */
export interface TimetableChangedEvent {
  changeType: 'changed' | 'cancelled' | 'room-swap' | 'substitution';
  lessonId: string;
  changeCount: number;
}
