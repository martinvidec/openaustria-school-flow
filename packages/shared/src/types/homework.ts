export interface HomeworkDto {
  id: string;
  title: string;
  description: string | null;
  dueDate: string; // ISO 8601
  classSubjectId: string;
  classBookEntryId: string | null;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (optional for list vs detail)
  subjectName?: string;
  className?: string;
}

export interface ExamDto {
  id: string;
  title: string;
  date: string; // ISO 8601
  classSubjectId: string;
  classId: string;
  duration: number | null;
  description: string | null;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  subjectName?: string;
  className?: string;
}

export interface ExamCollisionDto {
  hasCollision: boolean;
  existingExam?: ExamDto;
}

export interface CreateHomeworkRequest {
  title: string;
  description?: string;
  dueDate: string;
  classSubjectId: string;
  classBookEntryId?: string;
}

export interface CreateExamRequest {
  title: string;
  date: string;
  classSubjectId: string;
  classId: string;
  duration?: number;
  description?: string;
}
