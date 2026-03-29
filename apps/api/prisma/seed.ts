import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/config/database/generated/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // =====================================================
  // Section 1: Roles (upsert existing 5 roles -- D-01)
  // =====================================================
  const roles = [
    { name: 'admin', displayName: 'Administrator', description: 'System administrator (IT, Keycloak, Docker, API keys, system settings)' },
    { name: 'schulleitung', displayName: 'Schulleitung', description: 'School principal (pedagogical management, teacher/class admin, timetable, classbook oversight, permission overrides)' },
    { name: 'lehrer', displayName: 'Lehrer', description: 'Teacher' },
    { name: 'eltern', displayName: 'Eltern', description: 'Parent/Guardian' },
    { name: 'schueler', displayName: 'Schueler', description: 'Student' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
  }

  // Load roles for permission assignment
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const schulleitungRole = await prisma.role.findUniqueOrThrow({ where: { name: 'schulleitung' } });
  const lehrerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'lehrer' } });
  const elternRole = await prisma.role.findUniqueOrThrow({ where: { name: 'eltern' } });
  const schuelerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'schueler' } });

  // Clear existing permissions and re-seed
  await prisma.permission.deleteMany();

  // =====================================================
  // Section 2: Permissions (Phase 1 + Phase 2 subjects)
  // =====================================================

  // Admin: manage all (D-03: System scope)
  const adminPermissions = [
    { action: 'manage', subject: 'all' },
  ];

  // Schulleitung: pedagogical management (D-03) + Phase 2 subjects
  const schulleitungPermissions = [
    // Phase 1 subjects
    { action: 'manage', subject: 'school' },
    { action: 'manage', subject: 'timetable' },
    { action: 'manage', subject: 'classbook' },
    { action: 'read', subject: 'grades' },
    { action: 'read', subject: 'audit' },
    { action: 'manage', subject: 'permission' },
    { action: 'manage', subject: 'user' },
    // Phase 2: teacher (full CRUD)
    { action: 'create', subject: 'teacher' },
    { action: 'read', subject: 'teacher' },
    { action: 'update', subject: 'teacher' },
    { action: 'delete', subject: 'teacher' },
    // Phase 2: student (full CRUD)
    { action: 'create', subject: 'student' },
    { action: 'read', subject: 'student' },
    { action: 'update', subject: 'student' },
    { action: 'delete', subject: 'student' },
    // Phase 2: class (full CRUD)
    { action: 'create', subject: 'class' },
    { action: 'read', subject: 'class' },
    { action: 'update', subject: 'class' },
    { action: 'delete', subject: 'class' },
    // Phase 2: subject (full CRUD)
    { action: 'create', subject: 'subject' },
    { action: 'read', subject: 'subject' },
    { action: 'update', subject: 'subject' },
    { action: 'delete', subject: 'subject' },
    // Phase 2: consent (CRU, no delete -- consent records are historical)
    { action: 'create', subject: 'consent' },
    { action: 'read', subject: 'consent' },
    { action: 'update', subject: 'consent' },
    // Phase 2: retention (full CRUD)
    { action: 'create', subject: 'retention' },
    { action: 'read', subject: 'retention' },
    { action: 'update', subject: 'retention' },
    { action: 'delete', subject: 'retention' },
    // Phase 2: export (create + read)
    { action: 'create', subject: 'export' },
    { action: 'read', subject: 'export' },
    // Phase 2: dsfa (full CRUD)
    { action: 'create', subject: 'dsfa' },
    { action: 'read', subject: 'dsfa' },
    { action: 'update', subject: 'dsfa' },
    { action: 'delete', subject: 'dsfa' },
    // Phase 2: person (read + delete for DSGVO deletion)
    { action: 'read', subject: 'person' },
    { action: 'delete', subject: 'person' },
  ];

  // Lehrer: own classes, own grades (AUTH-03) + Phase 2 subjects
  const lehrerPermissions: Array<{ action: string; subject: string; conditions?: Record<string, string> }> = [
    // Phase 1 subjects
    { action: 'read', subject: 'school' },
    { action: 'read', subject: 'timetable' },
    { action: 'manage', subject: 'classbook', conditions: { teacherId: '{{ id }}' } },
    { action: 'manage', subject: 'grades', conditions: { teacherId: '{{ id }}' } },
    // Phase 2: teacher (read own profile + colleagues)
    { action: 'read', subject: 'teacher' },
    // Phase 2: student (read + update students in own classes)
    { action: 'read', subject: 'student', conditions: { teacherClasses: '{{ id }}' } },
    { action: 'update', subject: 'student', conditions: { teacherClasses: '{{ id }}' } },
    // Phase 2: class (read own classes)
    { action: 'read', subject: 'class' },
    // Phase 2: subject (read)
    { action: 'read', subject: 'subject' },
    // Phase 2: consent (read for own students)
    { action: 'read', subject: 'consent' },
    // Phase 2: export (own data export only)
    { action: 'create', subject: 'export' },
  ];

  // Eltern: own child only (AUTH-03) + Phase 2 subjects
  const elternPermissions: Array<{ action: string; subject: string; conditions?: Record<string, string> }> = [
    // Phase 1 subjects
    { action: 'read', subject: 'timetable', conditions: { parentId: '{{ id }}' } },
    { action: 'read', subject: 'grades', conditions: { parentId: '{{ id }}' } },
    { action: 'read', subject: 'classbook', conditions: { parentId: '{{ id }}' } },
    // Phase 2: student (read own children only)
    { action: 'read', subject: 'student', conditions: { parentId: '{{ id }}' } },
    // Phase 2: class (read child's class)
    { action: 'read', subject: 'class' },
    // Phase 2: subject (read)
    { action: 'read', subject: 'subject' },
    // Phase 2: consent (CRU -- own consent records)
    { action: 'create', subject: 'consent' },
    { action: 'read', subject: 'consent' },
    { action: 'update', subject: 'consent' },
    // Phase 2: export (own data export)
    { action: 'create', subject: 'export' },
    { action: 'read', subject: 'export' },
  ];

  // Schueler: own data only (AUTH-03) + Phase 2 subjects
  const schuelerPermissions: Array<{ action: string; subject: string; conditions?: Record<string, string> }> = [
    // Phase 1 subjects
    { action: 'read', subject: 'timetable', conditions: { studentId: '{{ id }}' } },
    { action: 'read', subject: 'grades', conditions: { studentId: '{{ id }}' } },
    // Phase 2: class (read own class)
    { action: 'read', subject: 'class', conditions: { studentId: '{{ id }}' } },
    // Phase 2: subject (read)
    { action: 'read', subject: 'subject' },
    // Phase 2: consent (read own consent)
    { action: 'read', subject: 'consent', conditions: { studentId: '{{ id }}' } },
    // Phase 2: export (own data)
    { action: 'create', subject: 'export' },
    { action: 'read', subject: 'export' },
  ];

  const allPermissions = [
    ...adminPermissions.map((p) => ({ ...p, roleId: adminRole.id })),
    ...schulleitungPermissions.map((p) => ({ ...p, roleId: schulleitungRole.id })),
    ...lehrerPermissions.map((p) => ({ ...p, roleId: lehrerRole.id })),
    ...elternPermissions.map((p) => ({ ...p, roleId: elternRole.id })),
    ...schuelerPermissions.map((p) => ({ ...p, roleId: schuelerRole.id })),
  ];

  for (const perm of allPermissions) {
    await prisma.permission.create({
      data: {
        roleId: perm.roleId,
        action: perm.action,
        subject: perm.subject,
        conditions: ('conditions' in perm && perm.conditions) ? perm.conditions : undefined,
      },
    });
  }

  console.log(`Seeded ${roles.length} roles and ${allPermissions.length} default permissions`);

  // =====================================================
  // Section 3: Sample school data for development
  // =====================================================

  // School: BG/BRG Musterstadt (AHS Unterstufe)
  const school = await prisma.school.upsert({
    where: { id: 'seed-school-bgbrg-musterstadt' },
    update: {},
    create: {
      id: 'seed-school-bgbrg-musterstadt',
      name: 'BG/BRG Musterstadt',
      schoolType: 'AHS_UNTER',
      address: 'Schulstrasse 1, 1010 Wien',
    },
  });

  // TimeGrid: default AHS time grid (50min periods, 5min breaks)
  const existingGrid = await prisma.timeGrid.findUnique({ where: { schoolId: school.id } });
  if (!existingGrid) {
    await prisma.timeGrid.create({
      data: {
        schoolId: school.id,
        periods: {
          create: [
            { periodNumber: 1, startTime: '08:00', endTime: '08:50', label: '1. Stunde', durationMin: 50 },
            { periodNumber: 2, startTime: '08:55', endTime: '09:45', label: '2. Stunde', durationMin: 50 },
            { periodNumber: 3, startTime: '09:45', endTime: '10:00', label: 'Grosse Pause', durationMin: 15, isBreak: true },
            { periodNumber: 4, startTime: '10:00', endTime: '10:50', label: '3. Stunde', durationMin: 50 },
            { periodNumber: 5, startTime: '10:55', endTime: '11:45', label: '4. Stunde', durationMin: 50 },
            { periodNumber: 6, startTime: '11:50', endTime: '12:40', label: '5. Stunde', durationMin: 50 },
            { periodNumber: 7, startTime: '12:40', endTime: '13:25', label: 'Mittagspause', durationMin: 45, isBreak: true },
            { periodNumber: 8, startTime: '13:25', endTime: '14:15', label: '6. Stunde', durationMin: 50 },
            { periodNumber: 9, startTime: '14:20', endTime: '15:10', label: '7. Stunde', durationMin: 50 },
          ],
        },
      },
    });
  }

  // SchoolYear: 2025/2026
  const existingYear = await prisma.schoolYear.findUnique({ where: { schoolId: school.id } });
  if (!existingYear) {
    await prisma.schoolYear.create({
      data: {
        schoolId: school.id,
        name: '2025/2026',
        startDate: new Date('2025-09-01'),
        semesterBreak: new Date('2026-02-07'),
        endDate: new Date('2026-07-04'),
      },
    });
  }
  const schoolYear = await prisma.schoolYear.findUniqueOrThrow({ where: { schoolId: school.id } });

  // SchoolDays: Monday-Friday active
  for (const day of ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const) {
    await prisma.schoolDay.upsert({
      where: { schoolId_dayOfWeek: { schoolId: school.id, dayOfWeek: day } },
      update: {},
      create: { schoolId: school.id, dayOfWeek: day, isActive: true },
    });
  }

  // --- Teachers (3 teachers with Person records) ---

  const teacher1Person = await prisma.person.upsert({
    where: { id: 'seed-person-teacher-1' },
    update: {},
    create: {
      id: 'seed-person-teacher-1',
      schoolId: school.id,
      personType: 'TEACHER',
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.mustermann@bgbrg-musterstadt.at',
    },
  });

  const teacher1 = await prisma.teacher.upsert({
    where: { personId: teacher1Person.id },
    update: {},
    create: {
      id: 'seed-teacher-1',
      personId: teacher1Person.id,
      schoolId: school.id,
      employmentPercentage: 100,
      werteinheitenTarget: 20,
      isPermanent: true,
    },
  });

  const teacher2Person = await prisma.person.upsert({
    where: { id: 'seed-person-teacher-2' },
    update: {},
    create: {
      id: 'seed-person-teacher-2',
      schoolId: school.id,
      personType: 'TEACHER',
      firstName: 'Anna',
      lastName: 'Lehrerin',
      email: 'anna.lehrerin@bgbrg-musterstadt.at',
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { personId: teacher2Person.id },
    update: {},
    create: {
      id: 'seed-teacher-2',
      personId: teacher2Person.id,
      schoolId: school.id,
      employmentPercentage: 75,
      werteinheitenTarget: 15,
      isPermanent: true,
    },
  });

  // Reduction for teacher2: Klassenvorstand 1.5 WE
  await prisma.teachingReduction.upsert({
    where: { id: 'seed-reduction-t2-kv' },
    update: {},
    create: {
      id: 'seed-reduction-t2-kv',
      teacherId: teacher2.id,
      reductionType: 'KLASSENVORSTAND',
      werteinheiten: 1.5,
      description: 'Klassenvorstand 1A',
    },
  });

  const teacher3Person = await prisma.person.upsert({
    where: { id: 'seed-person-teacher-3' },
    update: {},
    create: {
      id: 'seed-person-teacher-3',
      schoolId: school.id,
      personType: 'TEACHER',
      firstName: 'Peter',
      lastName: 'Sportlich',
      email: 'peter.sportlich@bgbrg-musterstadt.at',
    },
  });

  const teacher3 = await prisma.teacher.upsert({
    where: { personId: teacher3Person.id },
    update: {},
    create: {
      id: 'seed-teacher-3',
      personId: teacher3Person.id,
      schoolId: school.id,
      employmentPercentage: 100,
      werteinheitenTarget: 20,
      isPermanent: true,
    },
  });

  // --- Subjects (4 core subjects) ---

  const subjectDeutsch = await prisma.subject.upsert({
    where: { schoolId_shortName: { schoolId: school.id, shortName: 'D' } },
    update: {},
    create: {
      id: 'seed-subject-d',
      schoolId: school.id,
      name: 'Deutsch',
      shortName: 'D',
      subjectType: 'PFLICHT',
      lehrverpflichtungsgruppe: 'I',
      werteinheitenFactor: 1.105,
    },
  });

  const subjectMathematik = await prisma.subject.upsert({
    where: { schoolId_shortName: { schoolId: school.id, shortName: 'M' } },
    update: {},
    create: {
      id: 'seed-subject-m',
      schoolId: school.id,
      name: 'Mathematik',
      shortName: 'M',
      subjectType: 'PFLICHT',
      lehrverpflichtungsgruppe: 'II',
      werteinheitenFactor: 1.0,
    },
  });

  const subjectEnglisch = await prisma.subject.upsert({
    where: { schoolId_shortName: { schoolId: school.id, shortName: 'E' } },
    update: {},
    create: {
      id: 'seed-subject-e',
      schoolId: school.id,
      name: 'Englisch',
      shortName: 'E',
      subjectType: 'PFLICHT',
      lehrverpflichtungsgruppe: 'I',
      werteinheitenFactor: 1.105,
    },
  });

  const subjectBSP = await prisma.subject.upsert({
    where: { schoolId_shortName: { schoolId: school.id, shortName: 'BSP' } },
    update: {},
    create: {
      id: 'seed-subject-bsp',
      schoolId: school.id,
      name: 'Bewegung und Sport',
      shortName: 'BSP',
      subjectType: 'PFLICHT',
      lehrverpflichtungsgruppe: 'IVa',
      werteinheitenFactor: 0.857,
    },
  });

  // --- Teacher qualifications ---

  // Teacher1: D, E
  for (const subj of [subjectDeutsch, subjectEnglisch]) {
    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: teacher1.id, subjectId: subj.id } },
      update: {},
      create: { teacherId: teacher1.id, subjectId: subj.id },
    });
  }

  // Teacher2: M, PH, CH (PH and CH will be created below as additional subjects if needed)
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher2.id, subjectId: subjectMathematik.id } },
    update: {},
    create: { teacherId: teacher2.id, subjectId: subjectMathematik.id },
  });

  // Teacher3: BSP, BU (BU as additional subject)
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher3.id, subjectId: subjectBSP.id } },
    update: {},
    create: { teacherId: teacher3.id, subjectId: subjectBSP.id },
  });

  // --- Classes (2 first-year classes) ---

  const class1A = await prisma.schoolClass.upsert({
    where: { schoolId_name_schoolYearId: { schoolId: school.id, name: '1A', schoolYearId: schoolYear.id } },
    update: {},
    create: {
      id: 'seed-class-1a',
      schoolId: school.id,
      name: '1A',
      yearLevel: 1,
      schoolYearId: schoolYear.id,
    },
  });

  const class1B = await prisma.schoolClass.upsert({
    where: { schoolId_name_schoolYearId: { schoolId: school.id, name: '1B', schoolYearId: schoolYear.id } },
    update: {},
    create: {
      id: 'seed-class-1b',
      schoolId: school.id,
      name: '1B',
      yearLevel: 1,
      schoolYearId: schoolYear.id,
    },
  });

  // --- Students (6 students, 3 per class) ---

  const studentNames = [
    { firstName: 'Lisa', lastName: 'Huber', classId: class1A.id, num: 1 },
    { firstName: 'Felix', lastName: 'Bauer', classId: class1A.id, num: 2 },
    { firstName: 'Sophie', lastName: 'Wagner', classId: class1A.id, num: 3 },
    { firstName: 'Lukas', lastName: 'Gruber', classId: class1B.id, num: 4 },
    { firstName: 'Emma', lastName: 'Steiner', classId: class1B.id, num: 5 },
    { firstName: 'Maximilian', lastName: 'Hofer', classId: class1B.id, num: 6 },
  ];

  for (const s of studentNames) {
    const personId = `seed-person-student-${s.num}`;
    const studentId = `seed-student-${s.num}`;

    await prisma.person.upsert({
      where: { id: personId },
      update: {},
      create: {
        id: personId,
        schoolId: school.id,
        personType: 'STUDENT',
        firstName: s.firstName,
        lastName: s.lastName,
        email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@schueler.bgbrg-musterstadt.at`,
      },
    });

    await prisma.student.upsert({
      where: { personId },
      update: {},
      create: {
        id: studentId,
        personId,
        schoolId: school.id,
        classId: s.classId,
        studentNumber: `2025-${String(s.num).padStart(4, '0')}`,
        enrollmentDate: new Date('2025-09-01'),
      },
    });
  }

  // --- ClassSubjects (AHS_UNTER year 1 Stundentafel applied to both classes) ---

  // Core AHS_UNTER year 1 subjects from Stundentafel (4 seeded subjects)
  const classSubjectEntries = [
    { subjectId: subjectDeutsch.id, weeklyHours: 4 },
    { subjectId: subjectMathematik.id, weeklyHours: 4 },
    { subjectId: subjectEnglisch.id, weeklyHours: 4 },
    { subjectId: subjectBSP.id, weeklyHours: 4 },
  ];

  for (const cls of [class1A, class1B]) {
    for (const entry of classSubjectEntries) {
      // Check existence first (nullable groupId prevents compound upsert)
      const existing = await prisma.classSubject.findFirst({
        where: { classId: cls.id, subjectId: entry.subjectId, groupId: null },
      });
      if (!existing) {
        await prisma.classSubject.create({
          data: {
            classId: cls.id,
            subjectId: entry.subjectId,
            weeklyHours: entry.weeklyHours,
            isCustomized: false,
          },
        });
      }
    }
  }

  // =====================================================
  // Section 4: Default retention policies
  // =====================================================

  const retentionDefaults = [
    { dataCategory: 'noten', retentionDays: 21900 },           // 60 years (Austrian Aufbewahrungspflicht)
    { dataCategory: 'anwesenheit', retentionDays: 1825 },      // 5 years
    { dataCategory: 'kommunikation', retentionDays: 365 },     // 1 year
    { dataCategory: 'audit_mutation', retentionDays: 1095 },   // 3 years
    { dataCategory: 'audit_sensitive_read', retentionDays: 365 }, // 1 year
    { dataCategory: 'personal_data', retentionDays: 1825 },    // 5 years
    { dataCategory: 'health_data', retentionDays: 365 },       // 1 year
  ];

  for (const rp of retentionDefaults) {
    await prisma.retentionPolicy.upsert({
      where: { schoolId_dataCategory: { schoolId: school.id, dataCategory: rp.dataCategory } },
      update: {},
      create: {
        schoolId: school.id,
        dataCategory: rp.dataCategory,
        retentionDays: rp.retentionDays,
        isDefault: true,
      },
    });
  }

  // Override: kommunikation = 730 days (2 years instead of default 1)
  await prisma.retentionPolicy.upsert({
    where: { schoolId_dataCategory: { schoolId: school.id, dataCategory: 'kommunikation' } },
    update: { retentionDays: 730, isDefault: false },
    create: {
      schoolId: school.id,
      dataCategory: 'kommunikation',
      retentionDays: 730,
      isDefault: false,
    },
  });

  console.log(`Seeded ${roles.length} roles and ${allPermissions.length} default permissions`);
  console.log(`Seeded sample school: ${school.name} (${school.schoolType})`);
  console.log('Seeded 3 teachers, 6 students, 4 subjects, 2 classes, 7 retention policies');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
