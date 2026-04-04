import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { UserContextResponseDto } from './dto/user-context.dto';

@Injectable()
export class UserContextService {
  constructor(private prisma: PrismaService) {}

  async getUserContext(keycloakUserId: string): Promise<UserContextResponseDto> {
    const person = await this.prisma.person.findUnique({
      where: { keycloakUserId },
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
      throw new NotFoundException(
        'Person record not found for authenticated user',
      );
    }

    const result: UserContextResponseDto = {
      schoolId: person.schoolId,
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
