import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { UserContextResponseDto } from './dto/user-context.dto';

@Injectable()
export class UserContextService {
  constructor(private prisma: PrismaService) {}

  async getUserContext(
    keycloakUserId: string,
    currentSchoolId: string | null,
  ): Promise<UserContextResponseDto> {
    // Order memberships by school.createdAt asc so the SEED school (oldest)
    // is always [0]. Matches CurrentSchoolInterceptor's ordering — necessary
    // so the fallback `currentSchoolId ?? memberships[0].schoolId` resolves
    // to the SAME school the interceptor picked when no X-School-Id was
    // sent. Pre-#152 the unordered findMany made this racy under parallel
    // admin-throwaway e2e specs.
    const memberships = await this.prisma.person.findMany({
      where: { keycloakUserId },
      select: {
        schoolId: true,
        personType: true,
        school: { select: { name: true } },
      },
      orderBy: { school: { createdAt: 'asc' } },
    });

    if (memberships.length === 0) {
      throw new NotFoundException(
        'Person record not found for authenticated user',
      );
    }

    const activeSchoolId = currentSchoolId ?? memberships[0].schoolId;

    const person = await this.prisma.person.findFirst({
      where: { keycloakUserId, schoolId: activeSchoolId },
      include: {
        teacher: true,
        student: {
          include: {
            schoolClass: true,
          },
        },
        parent: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    person: true,
                    schoolClass: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!person) {
      // The interceptor validated the schoolId against memberships, so this
      // path is reachable only if a Person row was deleted mid-request.
      throw new NotFoundException(
        'Person record not found for the active school context',
      );
    }

    const result: UserContextResponseDto = {
      schoolId: person.schoolId,
      availableSchools: memberships.map((m) => ({
        schoolId: m.schoolId,
        schoolName: m.school.name,
        personType: m.personType,
      })),
      personId: person.id,
      personType: person.personType,
      firstName: person.firstName,
      lastName: person.lastName,
    };

    if (person.teacher) {
      result.teacherId = person.teacher.id;
    }

    if (person.student) {
      result.studentId = person.student.id;
      result.classId = person.student.classId ?? undefined;
      result.className = person.student.schoolClass?.name ?? undefined;
    }

    if (person.parent) {
      result.parentId = person.parent.id;
      const allChildren = person.parent.children
        .map((c) => c.student)
        .filter((s) => !!s);
      const firstChild = allChildren[0];
      if (firstChild) {
        result.childClassId = firstChild.classId ?? undefined;
        result.childClassName = firstChild.schoolClass?.name ?? undefined;
        result.childStudentName = `${firstChild.person.firstName} ${firstChild.person.lastName}`;
      }
      result.children = allChildren.map((s) => ({
        studentId: s.id,
        studentName: `${s.person.firstName} ${s.person.lastName}`,
        classId: s.classId ?? '',
        className: s.schoolClass?.name ?? '',
      }));
    }

    return result;
  }
}
