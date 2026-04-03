// --- Enums (mirror Prisma enums) ---
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type GradeCategory = 'SCHULARBEIT' | 'MUENDLICH' | 'MITARBEIT';
export type ExcuseStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ExcuseReason = 'KRANK' | 'ARZTTERMIN' | 'FAMILIAER' | 'SONSTIG';

// --- DTOs ---
export interface ClassBookEntryDto {
  id: string;
  classSubjectId: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  date: string; // ISO date string
  teacherId: string;
  schoolId: string;
  thema: string | null;
  lehrstoff: string | null;
  hausaufgabe: string | null;
  // Joined fields (populated by by-timetable-lesson endpoint and other joined queries)
  subjectName?: string;
  className?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecordDto {
  id: string;
  classBookEntryId: string;
  studentId: string;
  studentName: string; // joined: firstName + lastName
  status: AttendanceStatus;
  lateMinutes: number | null;
  excuseId: string | null;
  recordedBy: string;
  updatedAt: string;
}

export interface BulkAttendanceRequest {
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    lateMinutes?: number;
  }>;
}

export interface GradeEntryDto {
  id: string;
  schoolId: string;
  classSubjectId: string;
  studentId: string;
  studentName: string; // joined
  teacherId: string;
  category: GradeCategory;
  value: number; // decimal: 2+ = 1.75
  displayValue: string; // formatted: "2+"
  description: string | null;
  date: string;
  createdAt: string;
}

export interface GradeWeightDto {
  id: string;
  schoolId: string;
  classSubjectId: string | null;
  schularbeitPct: number;
  muendlichPct: number;
  mitarbeitPct: number;
}

export interface GradeMatrixRow {
  studentId: string;
  studentName: string;
  grades: GradeEntryDto[];
  weightedAverage: number | null;
}

export interface StudentNoteDto {
  id: string;
  classBookEntryId: string;
  studentId: string;
  studentName: string;
  authorId: string;
  authorName: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceExcuseDto {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  parentId: string;
  parentName: string;
  startDate: string;
  endDate: string;
  reason: ExcuseReason;
  note: string | null;
  status: ExcuseStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  attachments: ExcuseAttachmentDto[];
  createdAt: string;
}

export interface ExcuseAttachmentDto {
  id: string;
  excuseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AbsenceStatisticsDto {
  studentId: string;
  studentName: string;
  totalLessons: number;
  presentCount: number;
  absentUnexcusedCount: number;
  absentExcusedCount: number;
  lateCount: number;
  lateOver15MinCount: number;
  absenceRate: number; // percentage 0-100
}

// --- Grade utility types ---
export interface GradeWithCategory {
  value: number;
  category: GradeCategory;
}

export interface WeightConfig {
  schularbeitPct: number;
  muendlichPct: number;
  mitarbeitPct: number;
}

// --- WebSocket events ---
export interface ClassBookAttendanceUpdatedEvent {
  lessonId: string;
  classBookEntryId: string;
  teacherName: string;
  changeCount: number;
}

export interface ClassBookGradeAddedEvent {
  classSubjectId: string;
  gradeId: string;
}

export interface ClassBookExcuseUpdatedEvent {
  excuseId: string;
  studentId: string;
  status: ExcuseStatus;
}

export interface ClassBookEntryUpdatedEvent {
  classBookEntryId: string;
  lessonId: string;
}
