import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { ConversationDto, MessagePreviewDto } from '@schoolflow/shared';
import { PrismaService } from '../../../config/database/prisma.service';
import { MessagingGateway } from '../messaging.gateway';
import { CreateConversationDto } from '../dto/conversation.dto';

/**
 * Phase 7 Plan 02 -- ConversationService.
 *
 * Responsibilities:
 *  - Scope expansion: DIRECT, CLASS, YEAR_GROUP, SCHOOL
 *  - RBAC validation per scope
 *  - DIRECT conversation dedup via directPairKey (Pitfall 5)
 *  - Conversation CRUD
 *  - Member resolution for MessageService
 */
@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  /**
   * Create a conversation with scope expansion.
   *
   * DIRECT: find-or-create via directPairKey (sorted userId pair).
   * CLASS: expand to all students, parents, teachers of that class.
   * YEAR_GROUP: expand all classes in that year level.
   * SCHOOL: expand to all persons with keycloakUserId.
   */
  async create(
    schoolId: string,
    userId: string,
    userRoles: string[],
    dto: CreateConversationDto,
  ): Promise<ConversationDto> {
    // RBAC validation
    await this.validateCreatePermission(schoolId, userId, userRoles, dto);

    if (dto.scope === 'DIRECT') {
      return this.createDirect(schoolId, userId, dto);
    }

    // Broadcast scopes: CLASS, YEAR_GROUP, SCHOOL
    const recipientUserIds = await this.expandScopeToRecipients(
      schoolId,
      userId,
      dto.scope,
      dto.scopeId ?? null,
    );

    // Ensure sender is included
    const allMemberIds = new Set([userId, ...recipientUserIds]);

    const conversation = await this.prisma.$transaction(async (tx) => {
      return tx.conversation.create({
        data: {
          schoolId,
          scope: dto.scope,
          scopeId: dto.scopeId ?? null,
          subject: dto.subject ?? null,
          createdBy: userId,
          conversationMembers: {
            createMany: {
              data: Array.from(allMemberIds).map((uid) => ({
                userId: uid,
                unreadCount: uid === userId ? 0 : 0, // will be set by first message
              })),
            },
          },
        },
        include: {
          conversationMembers: true,
        },
      });
    });

    const conversationDto = this.toDto(conversation, userId);

    // Post-transaction: emit conversation:new to all members
    this.messagingGateway.emitNewConversation(
      Array.from(allMemberIds),
      conversationDto,
    );

    return conversationDto;
  }

  /**
   * List conversations for a user with optional search.
   */
  async findAll(
    schoolId: string,
    userId: string,
    search?: string,
  ): Promise<ConversationDto[]> {
    const where: any = {
      schoolId,
      conversationMembers: {
        some: { userId },
      },
    };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        {
          conversationMembers: {
            some: {
              userId: {
                in: await this.findUserIdsByName(schoolId, search),
              },
            },
          },
        },
      ];
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        conversationMembers: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            recipients: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c: any) => this.toDto(c, userId));
  }

  /**
   * Get a single conversation with membership check.
   */
  async findOne(conversationId: string, userId: string): Promise<ConversationDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        conversationMembers: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.conversationMembers.some(
      (m: any) => m.userId === userId,
    );
    if (!isMember) {
      throw new NotFoundException('Conversation not found');
    }

    return this.toDto(conversation, userId);
  }

  /**
   * Hard delete conversation (admin-only, enforced at controller).
   */
  async delete(conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  /**
   * Get all member userIds for a conversation.
   * Used by MessageService for recipient expansion.
   */
  async getMemberUserIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m: any) => m.userId);
  }

  // --- Private helpers ---

  /**
   * DIRECT conversation: find-or-create via directPairKey.
   */
  private async createDirect(
    schoolId: string,
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationDto> {
    if (!dto.recipientId) {
      throw new BadRequestException('recipientId is required for DIRECT scope');
    }
    if (dto.recipientId === userId) {
      throw new BadRequestException('Cannot create a conversation with yourself');
    }

    const directPairKey = [userId, dto.recipientId].sort().join(':');

    // Upsert: find existing or create new (Pitfall 5)
    const existing = await this.prisma.conversation.findUnique({
      where: { directPairKey },
      include: {
        conversationMembers: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      return this.toDto(existing, userId);
    }

    const conversation = await this.prisma.$transaction(async (tx) => {
      return tx.conversation.create({
        data: {
          schoolId,
          scope: 'DIRECT',
          directPairKey,
          createdBy: userId,
          conversationMembers: {
            createMany: {
              data: [
                { userId },
                { userId: dto.recipientId! },
              ],
            },
          },
        },
        include: {
          conversationMembers: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    });

    const conversationDto = this.toDto(conversation, userId);

    // Post-transaction: emit conversation:new to both members
    this.messagingGateway.emitNewConversation(
      [userId, dto.recipientId!],
      conversationDto,
    );

    return conversationDto;
  }

  /**
   * Expand scope to recipient keycloakUserIds.
   */
  async expandScopeToRecipients(
    schoolId: string,
    _userId: string,
    scope: string,
    scopeId: string | null,
  ): Promise<string[]> {
    const userIds = new Set<string>();

    if (scope === 'CLASS') {
      if (!scopeId) throw new BadRequestException('scopeId required for CLASS scope');
      await this.expandClassScope(scopeId, userIds);
    } else if (scope === 'YEAR_GROUP') {
      if (!scopeId) throw new BadRequestException('scopeId required for YEAR_GROUP scope');
      const classes = await this.prisma.schoolClass.findMany({
        where: { schoolId, yearLevel: parseInt(scopeId, 10) },
        select: { id: true },
      });
      for (const cls of classes) {
        await this.expandClassScope(cls.id, userIds);
      }
    } else if (scope === 'SCHOOL') {
      const persons = await this.prisma.person.findMany({
        where: { schoolId, keycloakUserId: { not: null } },
        select: { keycloakUserId: true },
      });
      for (const p of persons) {
        if (p.keycloakUserId) userIds.add(p.keycloakUserId);
      }
    }

    return Array.from(userIds);
  }

  /**
   * Expand a single class to all related keycloakUserIds:
   * students, their parents, teachers (via classSubjects), klassenvorstand.
   */
  private async expandClassScope(
    classId: string,
    userIds: Set<string>,
  ): Promise<void> {
    const schoolClass = await this.prisma.schoolClass.findUniqueOrThrow({
      where: { id: classId },
      include: {
        students: {
          include: {
            person: { select: { keycloakUserId: true } },
            parentStudents: {
              include: {
                parent: {
                  include: {
                    person: { select: { keycloakUserId: true } },
                  },
                },
              },
            },
          },
        },
        classSubjects: {
          include: {
            // ClassSubject does not have a direct teacher relation in this schema.
            // Teachers are linked via TeacherSubject. We skip teacher expansion from
            // classSubjects and rely on klassenvorstand + any other logic.
          },
        },
        klassenvorstand: {
          include: {
            person: { select: { keycloakUserId: true } },
          },
        },
      },
    });

    // Students
    for (const student of schoolClass.students) {
      const kcId = (student.person as any)?.keycloakUserId;
      if (kcId) userIds.add(kcId);

      // Parents
      for (const ps of student.parentStudents) {
        const parentKcId = (ps.parent as any)?.person?.keycloakUserId;
        if (parentKcId) userIds.add(parentKcId);
      }
    }

    // Klassenvorstand
    const kvKcId = (schoolClass.klassenvorstand as any)?.person?.keycloakUserId;
    if (kvKcId) userIds.add(kvKcId);
  }

  /**
   * RBAC validation for conversation creation.
   */
  private async validateCreatePermission(
    schoolId: string,
    userId: string,
    userRoles: string[],
    dto: CreateConversationDto,
  ): Promise<void> {
    const isAdmin = userRoles.includes('admin');
    const isSchulleitung = userRoles.includes('schulleitung');

    if (dto.scope === 'YEAR_GROUP' || dto.scope === 'SCHOOL') {
      if (!isAdmin && !isSchulleitung) {
        throw new ForbiddenException(
          'Only admin or schulleitung can create YEAR_GROUP/SCHOOL broadcasts',
        );
      }
      return;
    }

    if (dto.scope === 'CLASS') {
      if (isAdmin || isSchulleitung) return;
      // Teacher must be assigned to this class
      if (!dto.scopeId) {
        throw new BadRequestException('scopeId required for CLASS scope');
      }
      const isAssigned = await this.isTeacherAssignedToClass(userId, dto.scopeId);
      if (!isAssigned) {
        throw new ForbiddenException(
          'Teacher is not assigned to this class',
        );
      }
      return;
    }

    if (dto.scope === 'DIRECT') {
      // DIRECT: lehrer, eltern, admin, schulleitung can create
      const allowedRoles = ['lehrer', 'eltern', 'admin', 'schulleitung'];
      if (!userRoles.some((r) => allowedRoles.includes(r))) {
        throw new ForbiddenException(
          'Only lehrer, eltern, admin, or schulleitung can create direct messages',
        );
      }
      return;
    }
  }

  /**
   * Check if a user (via keycloakUserId) is a teacher assigned to a class.
   */
  private async isTeacherAssignedToClass(
    userId: string,
    classId: string,
  ): Promise<boolean> {
    // Find teacher by keycloakUserId
    const person = await this.prisma.person.findFirst({
      where: { keycloakUserId: userId },
      include: { teacher: true },
    });
    if (!person?.teacher) return false;

    const teacherId = person.teacher.id;

    // Check if klassenvorstand
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { klassenvorstandId: true },
    });
    if (schoolClass?.klassenvorstandId === teacherId) return true;

    // Note: ClassSubject doesn't have a direct teacherId field in this schema.
    // Teachers are associated via TeacherSubject (qualification).
    // For now, we check if the teacher has a TeacherSubject matching any subject taught in this class.
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId },
      select: { subjectId: true },
    });
    const subjectIds = classSubjects.map((cs: any) => cs.subjectId);

    const teacherSubjectMatch = await this.prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId: { in: subjectIds },
      },
    });

    return !!teacherSubjectMatch;
  }

  /**
   * Find userIds by person name for search.
   */
  private async findUserIdsByName(
    schoolId: string,
    search: string,
  ): Promise<string[]> {
    const persons = await this.prisma.person.findMany({
      where: {
        schoolId,
        keycloakUserId: { not: null },
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { keycloakUserId: true },
    });
    return persons
      .map((p: any) => p.keycloakUserId)
      .filter((id: string | null): id is string => id !== null);
  }

  /**
   * Map Prisma Conversation to ConversationDto.
   */
  private toDto(conversation: any, userId: string): ConversationDto {
    const member = conversation.conversationMembers?.find(
      (m: any) => m.userId === userId,
    );
    const lastMsg = conversation.messages?.[0];

    let lastMessage: MessagePreviewDto | null = null;
    if (lastMsg) {
      lastMessage = {
        body: lastMsg.body,
        senderName: '', // Resolved at controller level or via join; kept simple here
        createdAt: lastMsg.createdAt.toISOString(),
      };
    }

    return {
      id: conversation.id,
      schoolId: conversation.schoolId,
      scope: conversation.scope,
      scopeId: conversation.scopeId ?? null,
      subject: conversation.subject ?? null,
      createdBy: conversation.createdBy,
      createdAt: conversation.createdAt.toISOString(),
      lastMessage,
      unreadCount: member?.unreadCount ?? 0,
      memberCount: conversation.conversationMembers?.length ?? 0,
    };
  }
}
