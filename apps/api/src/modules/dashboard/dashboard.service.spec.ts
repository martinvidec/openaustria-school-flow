import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../config/database/prisma.service';
import { SchoolService } from '../school/school.service';

/**
 * Phase 16 Plan 01 Task 2 — Table-driven 10-category status matrix per
 * D-06 / D-23 (solver) / D-24 (timegrid). Mirrors retention.service.spec.ts
 * `mockPrisma` pattern.
 */

const mockPrisma = {
  school: {
    findUnique: vi.fn(),
  },
  timeGrid: { findUnique: vi.fn() },
  schoolDay: { count: vi.fn() },
  schoolYear: { findFirst: vi.fn() },
  subject: { count: vi.fn() },
  teacher: { count: vi.fn() },
  class: { count: vi.fn() },
  student: { count: vi.fn() },
  timetableRun: { count: vi.fn() },
  constraintWeightOverride: { count: vi.fn() },
  constraintTemplate: { count: vi.fn() },
  retentionPolicy: { count: vi.fn() },
  dsfaEntry: { count: vi.fn() },
  vvzEntry: { count: vi.fn() },
  auditEntry: { count: vi.fn() },
  person: { findFirst: vi.fn() },
};

const mockSchoolService = {
  findOne: vi.fn(),
};

const SCHOOL_ID = '11111111-1111-4111-8111-111111111111';

/**
 * Reset all mock counts to 0 / null per call so each test only sets the
 * mocks it cares about. Mirrors retention.service.spec.ts beforeEach pattern.
 */
function resetAllMocksToZero() {
  for (const key of Object.keys(mockPrisma) as Array<keyof typeof mockPrisma>) {
    const m = mockPrisma[key] as Record<string, ReturnType<typeof vi.fn>>;
    for (const fn of Object.values(m)) {
      fn.mockReset();
      // Default to 0 for counts and null for findUnique/findFirst
      fn.mockResolvedValue(0 as any);
    }
  }
  // Override the find* defaults to null
  mockPrisma.timeGrid.findUnique.mockResolvedValue(null);
  mockPrisma.schoolYear.findFirst.mockResolvedValue(null);
  mockPrisma.person.findFirst.mockResolvedValue(null);
  mockPrisma.school.findUnique.mockResolvedValue(null);
  mockSchoolService.findOne.mockReset();
  // SchoolService.findOne throws NotFoundException by default — keep as null
  mockSchoolService.findOne.mockResolvedValue(null);
}

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    resetAllMocksToZero();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SchoolService, useValue: mockSchoolService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  // -----------------------------------------------------------------
  // Test 1: SCHOOL category — D-06 row 1
  // -----------------------------------------------------------------
  describe('school category (D-06 row 1)', () => {
    it('done when name + schultyp + complete address', async () => {
      mockSchoolService.findOne.mockResolvedValue({
        id: SCHOOL_ID,
        name: 'GRG Wien',
        schoolType: 'AHS',
        address: { street: 'Hauptstr 1', postalCode: '1010', city: 'Wien' },
      });

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'school');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('Stammdaten vollständig');
    });

    it('partial when address missing fields', async () => {
      mockSchoolService.findOne.mockResolvedValue({
        id: SCHOOL_ID,
        name: 'GRG Wien',
        schoolType: 'AHS',
        address: { street: 'Hauptstr 1' },
      });

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'school');
      expect(cat?.status).toBe('partial');
      expect(cat?.secondary).toBe('Adresse oder Kontakt fehlt');
    });

    it('missing when no school record', async () => {
      mockSchoolService.findOne.mockRejectedValue(new Error('not found'));

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'school');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Schule angelegt');
    });
  });

  // -----------------------------------------------------------------
  // Test 2: TIMEGRID — D-24 (active SchoolDay union)
  // -----------------------------------------------------------------
  describe('timegrid category (D-24)', () => {
    it('done when >= 1 Period AND >= 1 active SchoolDay', async () => {
      mockPrisma.timeGrid.findUnique.mockResolvedValue({
        periods: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      });
      mockPrisma.schoolDay.count.mockResolvedValue(5);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'timegrid');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('3 Perioden + Wochentage konfiguriert');
    });

    it('partial when >= 1 Period but 0 active days', async () => {
      mockPrisma.timeGrid.findUnique.mockResolvedValue({
        periods: [{ id: 'p1' }],
      });
      mockPrisma.schoolDay.count.mockResolvedValue(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'timegrid');
      expect(cat?.status).toBe('partial');
      expect(cat?.secondary).toBe('Wochentage fehlen');
    });

    it('missing when 0 periods', async () => {
      mockPrisma.timeGrid.findUnique.mockResolvedValue(null);
      mockPrisma.schoolDay.count.mockResolvedValue(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'timegrid');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Perioden definiert');
    });
  });

  // -----------------------------------------------------------------
  // Test 3: SCHOOLYEAR
  // -----------------------------------------------------------------
  describe('schoolyear category', () => {
    it('done when active SY with start+end', async () => {
      mockPrisma.schoolYear.findFirst
        .mockResolvedValueOnce({ id: 'sy1' }) // anySchoolYear
        .mockResolvedValueOnce({
          id: 'sy1',
          name: '2026/2027',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2027-06-30'),
          isActive: true,
        }); // activeYear

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'schoolyear');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('Aktives Schuljahr: 2026/2027');
    });

    it('partial when SY exists but not active or incomplete', async () => {
      mockPrisma.schoolYear.findFirst
        .mockResolvedValueOnce({ id: 'sy1' })
        .mockResolvedValueOnce(null);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'schoolyear');
      expect(cat?.status).toBe('partial');
      expect(cat?.secondary).toBe('Schuljahr unvollständig');
    });

    it('missing when 0 SY records', async () => {
      mockPrisma.schoolYear.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'schoolyear');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch kein Schuljahr');
    });
  });

  // -----------------------------------------------------------------
  // Test 4: subjects / teachers / classes binary
  // -----------------------------------------------------------------
  describe('subjects/teachers/classes binary', () => {
    it('subjects done when count >= 1', async () => {
      mockPrisma.subject.count.mockResolvedValue(7);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'subjects');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('7 Fächer angelegt');
    });

    it('subjects missing when 0', async () => {
      mockPrisma.subject.count.mockResolvedValue(0);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'subjects');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Fächer');
    });

    it('teachers done when count >= 1', async () => {
      mockPrisma.teacher.count.mockResolvedValue(12);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'teachers');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('12 Lehrer:innen');
    });

    it('teachers missing when 0', async () => {
      mockPrisma.teacher.count.mockResolvedValue(0);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'teachers');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Lehrer:innen');
    });

    it('classes done when count >= 1', async () => {
      mockPrisma.class.count.mockResolvedValue(8);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'classes');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('8 Klassen');
    });

    it('classes missing when 0', async () => {
      mockPrisma.class.count.mockResolvedValue(0);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'classes');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Klassen');
    });
  });

  // -----------------------------------------------------------------
  // Test 5: STUDENTS ternary
  // -----------------------------------------------------------------
  describe('students ternary', () => {
    it('done when count >= 1 AND no classId IS NULL', async () => {
      mockPrisma.student.count
        .mockResolvedValueOnce(120) // total
        .mockResolvedValueOnce(0); // without class

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'students');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe(
        '120 Schüler:innen, alle einer Klasse zugeordnet',
      );
    });

    it('partial when >= 1 with classId IS NULL', async () => {
      mockPrisma.student.count
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(3);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'students');
      expect(cat?.status).toBe('partial');
      expect(cat?.secondary).toBe('3 ohne Klassenzuordnung');
    });

    it('missing when count = 0', async () => {
      mockPrisma.student.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'students');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Schüler:innen');
    });
  });

  // -----------------------------------------------------------------
  // Test 6: SOLVER (D-23)
  // -----------------------------------------------------------------
  describe('solver category (D-23)', () => {
    it('done when configExists AND completedRunCount >= 1', async () => {
      mockPrisma.constraintWeightOverride.count.mockResolvedValue(3);
      mockPrisma.constraintTemplate.count.mockResolvedValue(2);
      mockPrisma.timetableRun.count.mockResolvedValue(2);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'solver');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe(
        'Konfiguriert + 2 erfolgreich generierte Pläne',
      );
    });

    it('partial when configExists but 0 COMPLETED runs', async () => {
      mockPrisma.constraintWeightOverride.count.mockResolvedValue(1);
      mockPrisma.constraintTemplate.count.mockResolvedValue(0);
      mockPrisma.timetableRun.count.mockResolvedValue(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'solver');
      expect(cat?.status).toBe('partial');
      expect(cat?.secondary).toBe(
        'Konfiguration vorhanden, noch kein Lauf erfolgreich',
      );
    });

    it('missing when no config (both = 0)', async () => {
      mockPrisma.constraintWeightOverride.count.mockResolvedValue(0);
      mockPrisma.constraintTemplate.count.mockResolvedValue(0);
      mockPrisma.timetableRun.count.mockResolvedValue(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'solver');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Konfiguration');
    });
  });

  // -----------------------------------------------------------------
  // Test 7: DSGVO ternary
  // -----------------------------------------------------------------
  describe('dsgvo category', () => {
    it('done when retention + dsfa + vvz all >= 1', async () => {
      mockPrisma.retentionPolicy.count.mockResolvedValue(7);
      mockPrisma.dsfaEntry.count.mockResolvedValue(2);
      mockPrisma.vvzEntry.count.mockResolvedValue(3);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'dsgvo');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('Aufbewahrung, DSFA und VVZ gepflegt');
    });

    it('partial when retention >= 1 but dsfa OR vvz = 0', async () => {
      mockPrisma.retentionPolicy.count.mockResolvedValue(7);
      mockPrisma.dsfaEntry.count.mockResolvedValue(0);
      mockPrisma.vvzEntry.count.mockResolvedValue(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'dsgvo');
      expect(cat?.status).toBe('partial');
      expect(cat?.secondary).toBe(
        'Aufbewahrung gesetzt, DSFA/VVZ unvollständig',
      );
    });

    it('missing when all zero', async () => {
      mockPrisma.retentionPolicy.count.mockResolvedValue(0);
      mockPrisma.dsfaEntry.count.mockResolvedValue(0);
      mockPrisma.vvzEntry.count.mockResolvedValue(0);

      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'dsgvo');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine DSGVO-Einträge');
    });
  });

  // -----------------------------------------------------------------
  // Test 8: AUDIT
  // -----------------------------------------------------------------
  describe('audit category', () => {
    it('done when auditEntry.count >= 1', async () => {
      mockPrisma.auditEntry.count.mockResolvedValue(523);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'audit');
      expect(cat?.status).toBe('done');
      expect(cat?.secondary).toBe('523 protokollierte Aktionen');
    });

    it('missing when 0', async () => {
      mockPrisma.auditEntry.count.mockResolvedValue(0);
      const result = await service.getStatus(SCHOOL_ID);
      const cat = result.categories.find((c) => c.key === 'audit');
      expect(cat?.status).toBe('missing');
      expect(cat?.secondary).toBe('Noch keine Aktionen protokolliert');
    });
  });

  // -----------------------------------------------------------------
  // Test 9: Result shape — 10 categories in D-06 order
  // -----------------------------------------------------------------
  describe('result shape', () => {
    it('returns 10 categories in D-06 order', async () => {
      const result = await service.getStatus(SCHOOL_ID);
      expect(result.categories).toHaveLength(10);
      const keys = result.categories.map((c) => c.key);
      expect(keys).toEqual([
        'school',
        'timegrid',
        'schoolyear',
        'subjects',
        'teachers',
        'classes',
        'students',
        'solver',
        'dsgvo',
        'audit',
      ]);
    });

    it('result.schoolId is the input schoolId', async () => {
      const result = await service.getStatus(SCHOOL_ID);
      expect(result.schoolId).toBe(SCHOOL_ID);
    });

    it('result.generatedAt is a valid ISO-8601 string', async () => {
      const result = await service.getStatus(SCHOOL_ID);
      expect(result.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt,
      );
    });
  });

  // -----------------------------------------------------------------
  // Test 11: resolveAdminSchoolId
  // -----------------------------------------------------------------
  describe('resolveAdminSchoolId', () => {
    it('returns Person.schoolId for the keycloakUserId', async () => {
      mockPrisma.person.findFirst.mockResolvedValue({ schoolId: 'school-A' });
      expect(await service.resolveAdminSchoolId('kc-uuid-A')).toBe('school-A');
      expect(mockPrisma.person.findFirst).toHaveBeenCalledWith({
        where: { keycloakUserId: 'kc-uuid-A' },
        select: { schoolId: true },
      });
    });

    it('returns null when no Person matches', async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);
      expect(await service.resolveAdminSchoolId('kc-uuid-missing')).toBeNull();
    });
  });
});
