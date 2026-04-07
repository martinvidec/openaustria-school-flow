import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MessageDto, PollDto, PollOptionDto } from '@schoolflow/shared';
import { PrismaService } from '../../../config/database/prisma.service';
import { NotificationService } from '../../substitution/notification/notification.service';
import { MessagingGateway } from '../messaging.gateway';
import { CreatePollDto, CastVoteDto } from '../dto/poll.dto';

/**
 * Phase 7 Plan 03 -- PollService (COMM-06).
 *
 * Responsibilities:
 *  - Create poll inline with a message (D-09, D-12)
 *  - Cast votes: single-choice replaces, multi-choice sets (D-09)
 *  - Deadline auto-close (D-11)
 *  - Close poll manually (D-11)
 *  - Results: named for sender/admin, anonymous for others (D-10)
 */
@Injectable()
export class PollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  /**
   * Create a message with an inline poll (D-09, D-12).
   *
   * Creates Message (type=POLL), Poll, PollOptions, and MessageRecipient rows
   * in a single transaction. Sends MESSAGE_RECEIVED notifications.
   */
  async createWithMessage(
    conversationId: string,
    senderId: string,
    messageBody: string,
    pollDto: CreatePollDto,
  ): Promise<MessageDto> {
    // Verify sender is a member
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this conversation');
    }

    // Validate at least 2 options
    if (!pollDto.options || pollDto.options.length < 2) {
      throw new BadRequestException('Umfrage braucht mindestens 2 Optionen');
    }
    if (pollDto.options.length > 10) {
      throw new BadRequestException('Umfrage darf maximal 10 Optionen haben');
    }

    // Resolve sender name
    const senderPerson = await this.prisma.person.findFirst({
      where: { keycloakUserId: senderId },
      select: { firstName: true, lastName: true },
    });
    const senderName = senderPerson
      ? `${senderPerson.firstName} ${senderPerson.lastName}`
      : 'Unknown';

    // Get all member userIds
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const recipientIds = members
      .map((m: any) => m.userId)
      .filter((id: string) => id !== senderId);

    // Create message + poll + options + recipients in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Message with type=POLL
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          body: messageBody,
          type: 'POLL',
        },
      });

      // Create Poll
      const poll = await tx.poll.create({
        data: {
          messageId: msg.id,
          question: pollDto.question,
          type: pollDto.type,
          deadline: pollDto.deadline ? new Date(pollDto.deadline) : null,
          isClosed: false,
        },
      });

      // Create PollOptions
      const options = await Promise.all(
        pollDto.options.map((text, index) =>
          tx.pollOption.create({
            data: {
              pollId: poll.id,
              text,
              order: index,
            },
          }),
        ),
      );

      // Create MessageRecipient rows
      if (recipientIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: recipientIds.map((userId: string) => ({
            messageId: msg.id,
            userId,
            deliveredAt: new Date(),
          })),
        });

        // Increment unreadCount for recipients
        await tx.conversationMember.updateMany({
          where: {
            conversationId,
            userId: { in: recipientIds },
          },
          data: {
            unreadCount: { increment: 1 },
          },
        });
      }

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return { msg, poll, options };
    });

    // Send MESSAGE_RECEIVED notifications (outside transaction)
    const truncatedBody =
      messageBody.length > 100
        ? messageBody.substring(0, 100) + '...'
        : messageBody;

    for (const recipientId of recipientIds) {
      try {
        await this.notificationService.create({
          userId: recipientId,
          type: 'MESSAGE_RECEIVED',
          title: `Neue Umfrage von ${senderName}`,
          body: truncatedBody,
          payload: { conversationId, messageId: result.msg.id },
        });
      } catch {
        // Non-critical
      }
    }

    return {
      id: result.msg.id,
      conversationId: result.msg.conversationId,
      senderId: result.msg.senderId,
      senderName,
      body: result.msg.body,
      type: 'POLL',
      createdAt: result.msg.createdAt.toISOString(),
      attachments: [],
      poll: {
        id: result.poll.id,
        question: result.poll.question,
        type: result.poll.type as PollDto['type'],
        deadline: result.poll.deadline?.toISOString() ?? null,
        isClosed: result.poll.isClosed,
        options: result.options.map((o: any) => ({
          id: o.id,
          text: o.text,
          voteCount: 0,
        })),
        userVoteOptionIds: [],
      },
      readCount: 0,
      totalRecipients: recipientIds.length,
    };
  }

  /**
   * Cast a vote on a poll (D-09, D-11).
   *
   * SINGLE_CHOICE: exactly 1 optionId. Replaces previous vote.
   * MULTIPLE_CHOICE: 1+ optionIds. Replaces all previous votes.
   * Auto-closes poll if deadline has passed.
   */
  async castVote(
    pollId: string,
    userId: string,
    dto: CastVoteDto,
  ): Promise<PollDto> {
    // Fetch poll with options
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: { votes: true },
          orderBy: { order: 'asc' },
        },
        message: {
          select: {
            conversationId: true,
            conversation: {
              include: {
                conversationMembers: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Umfrage nicht gefunden');
    }

    // Check if user is a conversation member
    const isMember = poll.message.conversation.conversationMembers.length > 0;
    if (!isMember) {
      throw new ForbiddenException('Kein Zugriff auf diese Umfrage');
    }

    // Check closed status
    if (poll.isClosed) {
      throw new BadRequestException('Umfrage ist geschlossen');
    }

    // Check deadline -- auto-close if past
    if (poll.deadline && new Date(poll.deadline) < new Date()) {
      await this.prisma.poll.update({
        where: { id: pollId },
        data: { isClosed: true },
      });
      throw new BadRequestException('Frist abgelaufen');
    }

    // Validate optionIds
    const validOptionIds = new Set(poll.options.map((o: any) => o.id));
    for (const optionId of dto.optionIds) {
      if (!validOptionIds.has(optionId)) {
        throw new BadRequestException(`Ungueltige Option: ${optionId}`);
      }
    }

    // SINGLE_CHOICE: exactly 1 option
    if (poll.type === 'SINGLE_CHOICE' && dto.optionIds.length !== 1) {
      throw new BadRequestException(
        'Bei Einzelwahl muss genau eine Option gewaehlt werden',
      );
    }

    // MULTIPLE_CHOICE: at least 1 option
    if (poll.type === 'MULTIPLE_CHOICE' && dto.optionIds.length < 1) {
      throw new BadRequestException(
        'Bei Mehrfachwahl muss mindestens eine Option gewaehlt werden',
      );
    }

    // Delete existing votes for this user on this poll, then create new ones
    await this.prisma.$transaction(async (tx) => {
      // Delete all existing votes by this user on any option of this poll
      const allOptionIds = poll.options.map((o: any) => o.id);
      await tx.pollVote.deleteMany({
        where: {
          userId,
          pollOptionId: { in: allOptionIds },
        },
      });

      // Create new votes
      for (const optionId of dto.optionIds) {
        await tx.pollVote.create({
          data: {
            pollOptionId: optionId,
            userId,
          },
        });
      }
    });

    // Return updated poll
    const updatedResults = await this.getResults(pollId, userId);

    // Post-transaction: emit poll:vote to all conversation members
    const allMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId: poll.message.conversationId },
      select: { userId: true },
    });
    const memberUserIds = allMembers.map((m: any) => m.userId);
    this.messagingGateway.emitPollVote(memberUserIds, pollId, updatedResults.options);

    return updatedResults;
  }

  /**
   * Retract all votes from a poll.
   */
  async retractVote(pollId: string, userId: string): Promise<PollDto> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) {
      throw new NotFoundException('Umfrage nicht gefunden');
    }

    if (poll.isClosed) {
      throw new BadRequestException('Umfrage ist geschlossen');
    }

    const allOptionIds = poll.options.map((o: any) => o.id);
    await this.prisma.pollVote.deleteMany({
      where: {
        userId,
        pollOptionId: { in: allOptionIds },
      },
    });

    return this.getResults(pollId, userId);
  }

  /**
   * Close a poll manually (D-11).
   * Only the message sender or admin/schulleitung can close.
   */
  async closePoll(
    pollId: string,
    userId: string,
    userRoles: string[],
  ): Promise<PollDto> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        message: { select: { senderId: true } },
      },
    });

    if (!poll) {
      throw new NotFoundException('Umfrage nicht gefunden');
    }

    // Only sender, admin, or schulleitung can close
    const isAdmin = userRoles.includes('admin');
    const isSchulleitung = userRoles.includes('schulleitung');
    if (poll.message.senderId !== userId && !isAdmin && !isSchulleitung) {
      throw new ForbiddenException(
        'Nur der Ersteller oder Admin kann die Umfrage schliessen',
      );
    }

    await this.prisma.poll.update({
      where: { id: pollId },
      data: { isClosed: true },
    });

    return this.getResults(pollId, userId);
  }

  /**
   * Get poll results (D-10).
   *
   * Named results (voters array) for the message sender and admin/schulleitung.
   * Anonymous counts only for other participants.
   */
  async getResults(pollId: string, userId: string, userRoles?: string[]): Promise<PollDto> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        message: { select: { senderId: true } },
        options: {
          include: {
            votes: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Umfrage nicht gefunden');
    }

    // Determine if user gets named results
    const roles = userRoles ?? [];
    const isAdmin = roles.includes('admin');
    const isSchulleitung = roles.includes('schulleitung');
    const isSender = poll.message.senderId === userId;
    const showVoters = isSender || isAdmin || isSchulleitung;

    // Resolve voter names if needed
    const options: PollOptionDto[] = await Promise.all(
      poll.options.map(async (option: any) => {
        let voters: { userId: string; name: string }[] | undefined;

        if (showVoters && option.votes.length > 0) {
          const voterIds = option.votes.map((v: any) => v.userId);
          const persons = await this.prisma.person.findMany({
            where: { keycloakUserId: { in: voterIds } },
            select: { keycloakUserId: true, firstName: true, lastName: true },
          });
          const personMap = new Map(
            persons.map((p: any) => [
              p.keycloakUserId,
              `${p.firstName} ${p.lastName}`,
            ]),
          );

          voters = voterIds.map((vid: string) => ({
            userId: vid,
            name: personMap.get(vid) ?? 'Unknown',
          }));
        }

        return {
          id: option.id,
          text: option.text,
          voteCount: option.votes.length,
          ...(voters !== undefined ? { voters } : {}),
        };
      }),
    );

    // Determine which options the requesting user voted for
    const userVoteOptionIds = poll.options
      .filter((o: any) => o.votes.some((v: any) => v.userId === userId))
      .map((o: any) => o.id);

    return {
      id: poll.id,
      question: poll.question,
      type: poll.type as PollDto['type'],
      deadline: poll.deadline?.toISOString() ?? null,
      isClosed: poll.isClosed,
      options,
      userVoteOptionIds,
    };
  }
}
