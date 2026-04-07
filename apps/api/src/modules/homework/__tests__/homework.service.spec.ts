import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeworkService } from '../homework.service';
import type { HomeworkDto } from '@schoolflow/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makePrismaMock() {
  return {
    homework: {
      create: vi.fn(),
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

const CREATED_HOMEWORK_ROW = {
  id: 'hw-1',
  title: 'Kapitel 5',
  description: null,
  dueDate: new Date('2026-04-14'),
  classSubjectId: 'cs-1',
  classBookEntryId: null,
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

const MOCK_STUDENTS = [
  {
    id: 'student-1',
    personId: 'person-s1',
    classId: 'class-1',
    person: { keycloakUserId: 'kc-student-1' },
  },
  {
    id: 'student-2',
    personId: 'person-s2',
    classId: 'class-1',
    person: { keycloakUserId: 'kc-student-2' },
  },
];

const MOCK_PARENT_STUDENTS = [
  {
    parentId: 'parent-1',
    studentId: 'student-1',
    parent: { person: { keycloakUserId: 'kc-parent-1' } },
  },
  {
    parentId: 'parent-2',
    studentId: 'student-2',
    parent: { person: { keycloakUserId: 'kc-parent-2' } },
  },
];

describe('HomeworkService', () => {
  let service: HomeworkService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let notifications: ReturnType<typeof makeNotificationMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    notifications = makeNotificationMock();
    service = new HomeworkService(prisma as any, notifications as any);
  });

  // HW-01: Lehrer kann Hausaufgaben einer Unterrichtsstunde zuordnen
  describe('HW-01: homework CRUD linked to lesson', () => {
    it('creates homework with title, description, dueDate, classSubjectId, classBookEntryId', async () => {
      prisma.homework.create.mockResolvedValue(CREATED_HOMEWORK_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      const result = await service.create(SCHOOL_ID, {
        title: 'Kapitel 5',
        dueDate: '2026-04-14T00:00:00.000Z',
        classSubjectId: 'cs-1',
      }, USER_ID);

      expect(prisma.homework.create).toHaveBeenCalledWith({
        data: {
          title: 'Kapitel 5',
          description: undefined,
          dueDate: new Date('2026-04-14T00:00:00.000Z'),
          classSubjectId: 'cs-1',
          classBookEntryId: undefined,
          schoolId: SCHOOL_ID,
          createdBy: USER_ID,
        },
        include: CLASS_SUBJECT_INCLUDE,
      });
      expect(result.id).toBe('hw-1');
      expect(result.subjectName).toBe('Mathematik');
      expect(result.className).toBe('1A');
    });

    it('lists homework for a class subject', async () => {
      prisma.homework.findMany.mockResolvedValue([CREATED_HOMEWORK_ROW]);

      const results = await service.findByClassSubject('cs-1');
      expect(prisma.homework.findMany).toHaveBeenCalledWith({
        where: { classSubjectId: 'cs-1' },
        orderBy: { dueDate: 'desc' },
        include: CLASS_SUBJECT_INCLUDE,
      });
      expect(results).toHaveLength(1);
    });

    it('lists homework for a school', async () => {
      prisma.homework.findMany.mockResolvedValue([CREATED_HOMEWORK_ROW]);

      const results = await service.findBySchool(SCHOOL_ID, { skip: 0, take: 20 });
      expect(prisma.homework.findMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL_ID },
        orderBy: { dueDate: 'desc' },
        skip: 0,
        take: 20,
        include: CLASS_SUBJECT_INCLUDE,
      });
      expect(results).toHaveLength(1);
    });

    it('updates homework title and dueDate', async () => {
      const updated = { ...CREATED_HOMEWORK_ROW, title: 'Updated Title' };
      prisma.homework.update.mockResolvedValue(updated);

      const result = await service.update('hw-1', { title: 'Updated Title' });
      expect(prisma.homework.update).toHaveBeenCalledWith({
        where: { id: 'hw-1' },
        data: { title: 'Updated Title' },
        include: CLASS_SUBJECT_INCLUDE,
      });
      expect(result.title).toBe('Updated Title');
    });

    it('deletes homework by id', async () => {
      prisma.homework.delete.mockResolvedValue(CREATED_HOMEWORK_ROW);

      await service.delete('hw-1');
      expect(prisma.homework.delete).toHaveBeenCalledWith({
        where: { id: 'hw-1' },
      });
    });

    it('rejects create with missing required fields', async () => {
      prisma.homework.create.mockRejectedValue(new Error('Missing required fields'));

      await expect(
        service.create(SCHOOL_ID, { title: '', dueDate: '', classSubjectId: '' }, USER_ID),
      ).rejects.toThrow();
    });
  });

  // HW-03: notifications for students/parents
  describe('HW-03: homework notifications', () => {
    it('sends HOMEWORK_ASSIGNED notification to class students on create', async () => {
      prisma.homework.create.mockResolvedValue(CREATED_HOMEWORK_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      await service.create(SCHOOL_ID, {
        title: 'Kapitel 5',
        dueDate: '2026-04-14T00:00:00.000Z',
        classSubjectId: 'cs-1',
      }, USER_ID);

      // 2 students + 2 parents = 4 notifications
      const hwCalls = notifications.create.mock.calls.filter(
        (c: any[]) => c[0].type === 'HOMEWORK_ASSIGNED',
      );
      const studentCalls = hwCalls.filter(
        (c: any[]) => c[0].userId === 'kc-student-1' || c[0].userId === 'kc-student-2',
      );
      expect(studentCalls).toHaveLength(2);
    });

    it('sends HOMEWORK_ASSIGNED notification to class parents on create', async () => {
      prisma.homework.create.mockResolvedValue(CREATED_HOMEWORK_ROW);
      prisma.student.findMany.mockResolvedValue(MOCK_STUDENTS);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      await service.create(SCHOOL_ID, {
        title: 'Kapitel 5',
        dueDate: '2026-04-14T00:00:00.000Z',
        classSubjectId: 'cs-1',
      }, USER_ID);

      const hwCalls = notifications.create.mock.calls.filter(
        (c: any[]) => c[0].type === 'HOMEWORK_ASSIGNED',
      );
      const parentCalls = hwCalls.filter(
        (c: any[]) => c[0].userId === 'kc-parent-1' || c[0].userId === 'kc-parent-2',
      );
      expect(parentCalls).toHaveLength(2);
    });

    it('does NOT notify the creating teacher (self-notification prevention)', async () => {
      // Add creating teacher as a student's keycloakUserId to test exclusion
      const studentsWithTeacher = [
        ...MOCK_STUDENTS,
        {
          id: 'student-fake',
          personId: 'person-fake',
          classId: 'class-1',
          person: { keycloakUserId: USER_ID }, // same as creating teacher
        },
      ];
      prisma.homework.create.mockResolvedValue(CREATED_HOMEWORK_ROW);
      prisma.student.findMany.mockResolvedValue(studentsWithTeacher);
      prisma.parentStudent.findMany.mockResolvedValue(MOCK_PARENT_STUDENTS);

      await service.create(SCHOOL_ID, {
        title: 'Kapitel 5',
        dueDate: '2026-04-14T00:00:00.000Z',
        classSubjectId: 'cs-1',
      }, USER_ID);

      const allCalls = notifications.create.mock.calls;
      const teacherCalls = allCalls.filter(
        (c: any[]) => c[0].userId === USER_ID,
      );
      expect(teacherCalls).toHaveLength(0);
    });
  });
});
