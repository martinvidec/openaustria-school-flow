import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/config/database/generated/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create 5 standard roles (D-01)
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

  // Admin: manage all (D-03: System scope)
  const adminPermissions = [
    { action: 'manage', subject: 'all' },
  ];

  // Schulleitung: pedagogical management (D-03)
  const schulleitungPermissions = [
    { action: 'manage', subject: 'school' },
    { action: 'manage', subject: 'timetable' },
    { action: 'manage', subject: 'classbook' },
    { action: 'read', subject: 'grades' },
    { action: 'manage', subject: 'teacher' },
    { action: 'manage', subject: 'student' },
    { action: 'read', subject: 'audit' },
    { action: 'manage', subject: 'permission' },
    { action: 'manage', subject: 'user' },
  ];

  // Lehrer: own classes, own grades (AUTH-03)
  const lehrerPermissions: Array<{ action: string; subject: string; conditions?: Record<string, string> }> = [
    { action: 'read', subject: 'school' },
    { action: 'read', subject: 'timetable' },
    { action: 'manage', subject: 'classbook', conditions: { teacherId: '{{ id }}' } },
    { action: 'manage', subject: 'grades', conditions: { teacherId: '{{ id }}' } },
    { action: 'read', subject: 'student', conditions: { teacherClasses: '{{ id }}' } },
  ];

  // Eltern: own child only (AUTH-03)
  const elternPermissions: Array<{ action: string; subject: string; conditions?: Record<string, string> }> = [
    { action: 'read', subject: 'timetable', conditions: { parentId: '{{ id }}' } },
    { action: 'read', subject: 'grades', conditions: { parentId: '{{ id }}' } },
    { action: 'read', subject: 'student', conditions: { parentId: '{{ id }}' } },
    { action: 'read', subject: 'classbook', conditions: { parentId: '{{ id }}' } },
  ];

  // Schueler: own data only (AUTH-03)
  const schuelerPermissions: Array<{ action: string; subject: string; conditions?: Record<string, string> }> = [
    { action: 'read', subject: 'timetable', conditions: { studentId: '{{ id }}' } },
    { action: 'read', subject: 'grades', conditions: { studentId: '{{ id }}' } },
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
