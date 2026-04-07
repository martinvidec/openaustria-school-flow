import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamService } from '../exam.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makePrismaMock() {
  return {
    exam: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    parentStudent: {
      findMany: vi.fn(),
    },
  };
}

function makeNotificationMock() {
  return {
    create: vi.fn().mockResolvedValue({}),
  };
}

const SCHOOL_ID = 'school-1';
const USER_ID = 'teacher-kc-user-id';

const CLASS_SUBJECT_INCLUDE = {
  classSubject: {
    include: {
      schoolClass: true,
      subject: true,
    },
  },
};

const CREATED_EXAM_ROW = {
  id: 'exam-1',
  title: 'Mathematik SA 3',
  date: new Date('2026-04-20T08:00:00.000Z'),
  classSubjectId: 'cs-1',
  classId: 'class-1',
  duration: 50,
  description: null,
  schoolId: SCHOOL_ID,
  createdBy: USER_ID,
  createdAt: new Date('2026-04-07'),
  updatedAt: new Date('2026-04-07'),
  classSubject: {
    id: 'cs-1',
    classId: 'class-1',
    subjectId: 'subj-1',
    schoolClass: { id: 'class-1', name: '1A' },
    subject: { id: 'subj-1', name: 'Mathematik' },
  },
};

const EXISTING_EXAM_ROW = {
  id: 'exam-existing',
  title: 'Deutsch SA 2',
  date: new Date('2026-04-20T10:00:00.000Z'),
  classSubjectId: 'cs-2',
  classId: 'class-1',
  duration: 50,
  description: null,
  schoolId: SCHOOL_ID,
  createdBy: 'other-teacher',
  createdAt: new Date('2026-04-05'),
  updatedAt: new Date('2026-04-05'),
  classSubject: {
    id: 'cs-2',
    classId: 'class-1',
    subjectId: 'subj-2',
    schoolClass: { id: 'class-1', name: '1A' },
    subject: { id: 'subj-2', name: 'Deutsch' },
  },
};

const MOCK_STUDENTS = [
  {
    id: 'student-1',
    personId: 'person-s1',
    classId: 'class-1',
    person: { keycloakUserId: 'kc-student-1' },
  },
];

const MOCK_PARENT_STUDENTS = [
  {
    parentId: 'parent-1',
    studentId: 'student-1',
    parent: { person: { keycloakUserId: 'kc-parent-1' } },
  },
];

describe('ExamService', () => {
  let service: ExamService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let notifications: ReturnType<typeof makeNotificationMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    notifications = makeNotificationMock();
    service = new ExamService(prisma as any, notifications as any);
  });

  // HW-02: Lehrer kann Pruefungstermine eintragen mit Kollisionserkennung
  describe('HW-02: exam CRUD with collision detection', () => {
    it('creates exam with title, date, classSubjectId, classId', async () => {
      prisma.exam.findFirst.mockResolvedValue(null); // no collision
      prisma.exam.create.mockResolvedValue(CREATED_EXAM_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      const result = await service.create(SCHOOL_ID, {
        title: 'Mathematik SA 3',
        date: '2026-04-20T08:00:00.000Z',
        classSubjectId: 'cs-1',
        classId: 'class-1',
        duration: 50,
      }, USER_ID);

      expect(result.exam.id).toBe('exam-1');
      expect(result.exam.subjectName).toBe('Mathematik');
      expect(result.collision.hasCollision).toBe(false);
    });

    it('detects collision when exam exists on same day for same class', async () => {
      prisma.exam.findFirst.mockResolvedValue(EXISTING_EXAM_ROW);

      const result = await service.checkCollision('class-1', '2026-04-20T08:00:00.000Z');
      expect(result.hasCollision).toBe(true);
      expect(result.existingExam).toBeDefined();
      expect(result.existingExam!.id).toBe('exam-existing');
    });

    it('returns no collision when no exams on that day', async () => {
      prisma.exam.findFirst.mockResolvedValue(null);

      const result = await service.checkCollision('class-1', '2026-04-20T08:00:00.000Z');
      expect(result.hasCollision).toBe(false);
      expect(result.existingExam).toBeUndefined();
    });

    it('allows override when collision exists (D-03 soft warning)', async () => {
      prisma.exam.findFirst.mockResolvedValue(EXISTING_EXAM_ROW);
      prisma.exam.create.mockResolvedValue(CREATED_EXAM_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      // D-03: still creates the exam even when collision exists
      const result = await service.create(SCHOOL_ID, {
        title: 'Mathematik SA 3',
        date: '2026-04-20T08:00:00.000Z',
        classSubjectId: 'cs-1',
        classId: 'class-1',
      }, USER_ID);

      expect(result.exam.id).toBe('exam-1');
      expect(result.collision.hasCollision).toBe(true);
      expect(result.collision.existingExam!.id).toBe('exam-existing');
      expect(prisma.exam.create).toHaveBeenCalled();
    });

    it('lists exams for a class', async () => {
      prisma.exam.findMany.mockResolvedValue([CREATED_EXAM_ROW]);

      const results = await service.findByClass('class-1');
      expect(prisma.exam.findMany).toHaveBeenCalledWith({
        where: { classId: 'class-1' },
        orderBy: { date: 'asc' },
        include: CLASS_SUBJECT_INCLUDE,
      });
      expect(results).toHaveLength(1);
    });

    it('lists exams for a class subject', async () => {
      prisma.exam.findMany.mockResolvedValue([CREATED_EXAM_ROW]);

      const results = await service.findByClassSubject('cs-1');
      expect(prisma.exam.findMany).toHaveBeenCalledWith({
        where: { classSubjectId: 'cs-1' },
        orderBy: { date: 'asc' },
        include: CLASS_SUBJECT_INCLUDE,
      });
      expect(results).toHaveLength(1);
    });

    it('updates exam date and re-checks collision', async () => {
      const updatedRow = { ...CREATED_EXAM_ROW, date: new Date('2026-04-27') };
      prisma.exam.findUniqueOrThrow.mockResolvedValue(CREATED_EXAM_ROW);
      prisma.exam.findFirst.mockResolvedValue(null); // no collision on new date
      prisma.exam.update.mockResolvedValue(updatedRow);

      const result = await service.update('exam-1', { date: '2026-04-27T08:00:00.000Z' });
      expect(result.exam.date).toBeDefined();
      expect(prisma.exam.findFirst).toHaveBeenCalled(); // collision re-check
    });

    it('deletes exam by id', async () => {
      prisma.exam.delete.mockResolvedValue(CREATED_EXAM_ROW);

      await service.delete('exam-1');
      expect(prisma.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-1' },
      });
    });
  });

  // HW-03: exam notifications
  describe('HW-03: exam notifications', () => {
    it('sends EXAM_SCHEDULED notification to class students on create', async () => {
      prisma.exam.findFirst.mockResolvedValue(null);
      prisma.exam.create.mockResolvedValue(CREATED_EXAM_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      await service.create(SCHOOL_ID, {
        title: 'Mathematik SA 3',
        date: '2026-04-20T08:00:00.000Z',
        classSubjectId: 'cs-1',
        classId: 'class-1',
      }, USER_ID);

      const examCalls = notifications.create.mock.calls.filter(
        (c: any[]) => c[0].type === 'EXAM_SCHEDULED',
      );
      const studentCalls = examCalls.filter(
        (c: any[]) => c[0].userId === 'kc-student-1',
      );
      expect(studentCalls).toHaveLength(1);
    });

    it('sends EXAM_SCHEDULED notification to class parents on create', async () => {
      prisma.exam.findFirst.mockResolvedValue(null);
      prisma.exam.create.mockResolvedValue(CREATED_EXAM_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      await service.create(SCHOOL_ID, {
        title: 'Mathematik SA 3',
        date: '2026-04-20T08:00:00.000Z',
        classSubjectId: 'cs-1',
        classId: 'class-1',
      }, USER_ID);

      const examCalls = notifications.create.mock.calls.filter(
        (c: any[]) => c[0].type === 'EXAM_SCHEDULED',
      );
      const parentCalls = examCalls.filter(
        (c: any[]) => c[0].userId === 'kc-parent-1',
      );
      expect(parentCalls).toHaveLength(1);
    });

    it('does NOT notify the creating teacher', async () => {
      const studentsWithTeacher = [
        ...MOCK_STUDENTS,
        {
          id: 'student-fake',
          personId: 'person-fake',
          classId: 'class-1',
          person: { keycloakUserId: USER_ID },
        },
      ];
      prisma.exam.findFirst.mockResolvedValue(null);
      prisma.exam.create.mockResolvedValue(CREATED_EXAM_ROW);
      prisma.student.findMany.mockResolvedValue(studentsWithTeacher);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      await service.create(SCHOOL_ID, {
        title: 'Mathematik SA 3',
        date: '2026-04-20T08:00:00.000Z',
        classSubjectId: 'cs-1',
        classId: 'class-1',
      }, USER_ID);

      const teacherCalls = notifications.create.mock.calls.filter(
        (c: any[]) => c[0].userId === USER_ID,
      );
      expect(teacherCalls).toHaveLength(0);
    });
  });
});
