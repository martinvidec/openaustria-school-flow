import { Test, TestingModule } from '@nestjs/testing';
import { SolverInputService } from './solver-input.service';
import { PrismaService } from '../../config/database/prisma.service';
import { ConstraintTemplateService } from './constraint-template.service';

describe('SolverInputService.processConstraintTemplates', () => {
  let service: SolverInputService;
  let constraintTemplateService: any;

  const mockPrismaService = {
    constraintTemplate: { findMany: vi.fn() },
  };

  const mockConstraintTemplateService = {
    findActive: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolverInputService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConstraintTemplateService, useValue: mockConstraintTemplateService },
      ],
    }).compile();

    service = module.get<SolverInputService>(SolverInputService);
    constraintTemplateService = module.get(ConstraintTemplateService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function template(type: string, params: Record<string, any>, overrides: Record<string, any> = {}) {
    return {
      id: `t-${Math.random().toString(36).slice(2, 7)}`,
      schoolId: 'school-1',
      templateType: type,
      params,
      isActive: true,
      createdAt: new Date('2026-04-25T10:00:00Z'),
      ...overrides,
    };
  }

  it('handles NO_LESSONS_AFTER → classTimeslotRestrictions', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('NO_LESSONS_AFTER', { classId: 'class-1a', maxPeriod: 5 }),
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.classTimeslotRestrictions).toEqual([
      { classId: 'class-1a', maxPeriod: 5 },
    ]);
  });

  it('handles SUBJECT_MORNING → subjectTimePreferences', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('SUBJECT_MORNING', { subjectId: 'sub-mathe', latestPeriod: 4 }),
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.subjectTimePreferences).toEqual([
      { subjectId: 'sub-mathe', latestPeriod: 4 },
    ]);
  });

  it('handles SUBJECT_PREFERRED_SLOT → subjectPreferredSlots (NEW)', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('SUBJECT_PREFERRED_SLOT', {
        subjectId: 'sub-sport',
        dayOfWeek: 'TUESDAY',
        period: 1,
      }),
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.subjectPreferredSlots).toEqual([
      { subjectId: 'sub-sport', dayOfWeek: 'TUESDAY', period: 1 },
    ]);
  });

  it('dedupes NO_LESSONS_AFTER per classId, keeps min(maxPeriod) — strictest wins', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('NO_LESSONS_AFTER', { classId: 'class-1a', maxPeriod: 5 }),
      template('NO_LESSONS_AFTER', { classId: 'class-1a', maxPeriod: 4 }), // strictest
      template('NO_LESSONS_AFTER', { classId: 'class-1b', maxPeriod: 6 }),
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.classTimeslotRestrictions).toHaveLength(2);
    const r1a = result.classTimeslotRestrictions.find((r) => r.classId === 'class-1a');
    expect(r1a?.maxPeriod).toBe(4);
  });

  it('dedupes SUBJECT_MORNING per subjectId, keeps min(latestPeriod) — strictest wins', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('SUBJECT_MORNING', { subjectId: 'sub-mathe', latestPeriod: 4 }),
      template('SUBJECT_MORNING', { subjectId: 'sub-mathe', latestPeriod: 3 }), // strictest
      template('SUBJECT_MORNING', { subjectId: 'sub-deutsch', latestPeriod: 5 }),
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.subjectTimePreferences).toHaveLength(2);
    const m = result.subjectTimePreferences.find((p) => p.subjectId === 'sub-mathe');
    expect(m?.latestPeriod).toBe(3);
  });

  it('keeps ALL SUBJECT_PREFERRED_SLOT entries (cumulative reward, no dedupe)', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('SUBJECT_PREFERRED_SLOT', {
        subjectId: 'sub-sport',
        dayOfWeek: 'TUESDAY',
        period: 1,
      }),
      template('SUBJECT_PREFERRED_SLOT', {
        subjectId: 'sub-sport',
        dayOfWeek: 'THURSDAY',
        period: 2,
      }),
      template('SUBJECT_PREFERRED_SLOT', {
        subjectId: 'sub-sport',
        dayOfWeek: 'TUESDAY',
        period: 1,
      }), // duplicate kept
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.subjectPreferredSlots).toHaveLength(3);
  });

  it('returns empty arrays when no active templates exist', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.classTimeslotRestrictions).toEqual([]);
    expect(result.subjectTimePreferences).toEqual([]);
    expect(result.subjectPreferredSlots).toEqual([]);
    expect(result.additionalBlockedSlots).toEqual([]);
  });

  it('handles BLOCK_TIMESLOT → additionalBlockedSlots (one entry per period in the array)', async () => {
    constraintTemplateService.findActive.mockResolvedValueOnce([
      template('BLOCK_TIMESLOT', {
        teacherId: 'teacher-1',
        dayOfWeek: 'MONDAY',
        periods: [3, 4, 5],
      }),
    ]);

    const result = await service.processConstraintTemplates('school-1');

    expect(result.additionalBlockedSlots).toHaveLength(3);
    expect(result.additionalBlockedSlots[0]).toEqual({
      teacherId: 'teacher-1',
      dayOfWeek: 'MONDAY',
      periodNumber: 3,
    });
  });
});

describe('SolverInputService.deriveLessonWeekTypes (Issue #72 regression)', () => {
  let service: SolverInputService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolverInputService,
        {
          provide: PrismaService,
          useValue: { constraintTemplate: { findMany: vi.fn() } },
        },
        {
          provide: ConstraintTemplateService,
          useValue: { findActive: vi.fn() },
        },
      ],
    }).compile();
    service = module.get<SolverInputService>(SolverInputService);
  });

  // Private method — access via cast. The Issue #72 contract belongs on
  // the public buildSolverInput pipeline, but the rhythm-derivation logic
  // is the entire interesting surface and isolating it makes failure modes
  // readable on the failure line itself.
  const derive = (
    length: number,
    mask: number | null,
    abEnabled: boolean,
  ): Array<'BOTH' | 'A' | 'B'> =>
    (service as any).deriveLessonWeekTypes(length, mask, abEnabled);

  // The original Issue #72 symptom: solver-input.service.ts:321 hardcoded
  // `weekType: 'BOTH'`. On a school with abWeekEnabled=true, timeslots
  // split into A/B but every lesson stayed BOTH — per-week semantics dead.
  // This first assertion is the regression lock: with abWeekEnabled=true,
  // an every-week subject MUST split into [A, B] lesson variants, not BOTH.
  it('abWeekEnabled=true + cycleLength=1 → [A, B] (catches the original BOTH-hardcode bug)', () => {
    expect(derive(1, null, true)).toEqual(['A', 'B']);
  });

  it('abWeekEnabled=false + cycleLength=1 → [BOTH] (legacy non-A/B path stays untouched)', () => {
    expect(derive(1, null, false)).toEqual(['BOTH']);
  });

  it('A-week only: cycleLength=2, mask=0b01, abWeekEnabled=true → [A]', () => {
    expect(derive(2, 0b01, true)).toEqual(['A']);
  });

  it('B-week only: cycleLength=2, mask=0b10, abWeekEnabled=true → [B]', () => {
    expect(derive(2, 0b10, true)).toEqual(['B']);
  });

  it('BOTH semantics on A/B school: cycleLength=2, mask=0b11, abWeekEnabled=true → [A, B]', () => {
    expect(derive(2, 0b11, true)).toEqual(['A', 'B']);
  });

  it('BOTH semantics on non-A/B school: cycleLength=2, mask=0b11, abWeekEnabled=false → [BOTH]', () => {
    expect(derive(2, 0b11, false)).toEqual(['BOTH']);
  });

  it('forward-compat: n>2 cycles fall back to every-week — never silently drop subjects', () => {
    // The UI does not yet emit cycleLength>2. If a row sneaks in via API
    // or import, expanding to every-week is safer than zero lessons.
    expect(derive(3, 0b001, true)).toEqual(['A', 'B']);
    expect(derive(4, 0b1010, false)).toEqual(['BOTH']);
  });

  it('mask=0 defensive fallback: invalid mask collapses to every-week, never empty', () => {
    // class-subject.service.ts rejects mask=0 in the API layer; this is a
    // defence-in-depth assertion that the derive helper alone would not
    // emit zero lessons even if a row slipped through.
    expect(derive(2, 0, true)).toEqual(['A', 'B']);
    expect(derive(2, 0, false)).toEqual(['BOTH']);
  });
});
