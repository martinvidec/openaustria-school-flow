import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { CreateRoomBookingDto, RoomBookingResponseDto } from './dto/room-booking.dto';
import { RoomAvailabilityQueryDto, RoomAvailabilitySlotDto } from './dto/room-availability.dto';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  private timetableEventsGateway: any = null;

  /**
   * Inject the TimetableEventsGateway at runtime to avoid circular dependency.
   * Called from RoomModule.onModuleInit().
   */
  setTimetableEventsGateway(gateway: any): void {
    this.timetableEventsGateway = gateway;
  }

  async create(schoolId: string, dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        schoolId,
        name: dto.name,
        roomType: dto.roomType as any,
        capacity: dto.capacity,
        equipment: dto.equipment ?? [],
      },
    });
  }

  async findAll(schoolId: string, pagination: PaginationQueryDto): Promise<PaginatedResponseDto<any>> {
    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where: { schoolId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.room.count({ where: { schoolId } }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException('Die angeforderte Ressource wurde nicht gefunden.');
    }
    return room;
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.roomType !== undefined && { roomType: dto.roomType as any }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.equipment !== undefined && { equipment: dto.equipment }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.room.delete({ where: { id } });
  }

  /**
   * Book a room for an ad-hoc usage (ROOM-03, D-13).
   * Checks conflicts against both existing RoomBookings and TimetableLesson assignments
   * on the active TimetableRun.
   */
  async bookRoom(
    schoolId: string,
    dto: CreateRoomBookingDto,
    userId: string,
  ): Promise<RoomBookingResponseDto> {
    // Verify room belongs to schoolId
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, schoolId },
    });
    if (!room) {
      throw new NotFoundException('Raum nicht gefunden oder gehoert nicht zu dieser Schule.');
    }

    const weekType = dto.weekType || 'BOTH';

    // Check for existing RoomBooking conflict
    const existingBooking = await this.prisma.roomBooking.findFirst({
      where: {
        roomId: dto.roomId,
        dayOfWeek: dto.dayOfWeek as any,
        periodNumber: dto.periodNumber,
        OR: [
          { weekType },
          { weekType: 'BOTH' },
          ...(weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
        ],
      },
    });
    if (existingBooking) {
      throw new ConflictException(
        'Dieser Raum ist fuer die gewaehlte Zeit bereits belegt. Bitte waehlen Sie einen anderen Zeitpunkt.',
      );
    }

    // Check for TimetableLesson conflict on active run. Newest-active wins
    // when multiple isActive=true rows exist (transient state during parallel
    // E2E fixtures); matches the timetable.service.getView ordering.
    const activeRun = await this.prisma.timetableRun.findFirst({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (activeRun) {
      const lessonConflict = await this.prisma.timetableLesson.findFirst({
        where: {
          runId: activeRun.id,
          roomId: dto.roomId,
          dayOfWeek: dto.dayOfWeek as any,
          periodNumber: dto.periodNumber,
          OR: [
            { weekType },
            { weekType: 'BOTH' },
            ...(weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
          ],
        },
      });
      if (lessonConflict) {
        throw new ConflictException(
          'Dieser Raum ist fuer die gewaehlte Zeit bereits belegt. Bitte waehlen Sie einen anderen Zeitpunkt.',
        );
      }
    }

    // Create the booking
    const booking = await this.prisma.roomBooking.create({
      data: {
        roomId: dto.roomId,
        bookedBy: userId,
        dayOfWeek: dto.dayOfWeek as any,
        periodNumber: dto.periodNumber,
        weekType,
        purpose: dto.purpose ?? null,
        isAdHoc: true,
      },
      include: { room: true },
    });

    // Emit WebSocket event for real-time propagation (D-16)
    if (this.timetableEventsGateway) {
      this.timetableEventsGateway.emitRoomBookingChanged(schoolId, {
        action: 'booked' as const,
        roomId: room.id,
        roomName: room.name,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
      });
    }

    return {
      id: booking.id,
      roomId: booking.roomId,
      roomName: booking.room.name,
      bookedBy: booking.bookedBy,
      dayOfWeek: booking.dayOfWeek,
      periodNumber: booking.periodNumber,
      weekType: booking.weekType,
      purpose: booking.purpose,
      isAdHoc: booking.isAdHoc,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  /**
   * Cancel an existing room booking.
   * Only the original booker or users with admin/schulleitung role can cancel.
   */
  async cancelBooking(
    schoolId: string,
    bookingId: string,
    userId: string,
    userRoles: string[],
  ): Promise<void> {
    const booking = await this.prisma.roomBooking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });
    if (!booking) {
      throw new NotFoundException('Buchung nicht gefunden.');
    }

    // Verify room belongs to schoolId
    if (booking.room.schoolId !== schoolId) {
      throw new NotFoundException('Buchung nicht gefunden.');
    }

    // Check ownership or admin/schulleitung role
    const isOwner = booking.bookedBy === userId;
    const isAdmin = userRoles.some((r) =>
      ['admin', 'schulleitung', 'realm-admin'].includes(r.toLowerCase()),
    );
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Nur der Ersteller oder ein Administrator kann diese Buchung stornieren.');
    }

    await this.prisma.roomBooking.delete({ where: { id: bookingId } });

    // Emit WebSocket event for real-time propagation (D-16)
    if (this.timetableEventsGateway) {
      this.timetableEventsGateway.emitRoomBookingChanged(schoolId, {
        action: 'cancelled' as const,
        roomId: booking.roomId,
        roomName: booking.room.name,
        dayOfWeek: booking.dayOfWeek,
        periodNumber: booking.periodNumber,
      });
    }
  }

  /**
   * Get room availability grid for a given day (D-13).
   * Returns rooms x periods with occupied/free status.
   */
  async getAvailability(
    schoolId: string,
    query: RoomAvailabilityQueryDto,
  ): Promise<RoomAvailabilitySlotDto[]> {
    // Build room filter
    const roomWhere: any = { schoolId };
    if (query.roomType) {
      roomWhere.roomType = query.roomType;
    }
    if (query.minCapacity) {
      roomWhere.capacity = { gte: query.minCapacity };
    }
    if (query.equipment) {
      const tags = query.equipment.split(',').map((t) => t.trim()).filter(Boolean);
      roomWhere.equipment = { hasEvery: tags };
    }

    // Find matching rooms
    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      orderBy: { name: 'asc' },
    });

    if (rooms.length === 0) {
      return [];
    }

    // Get school time grid periods (non-break only)
    const timeGrid = await this.prisma.timeGrid.findUnique({
      where: { schoolId },
      include: {
        periods: {
          where: { isBreak: false },
          orderBy: { periodNumber: 'asc' },
        },
      },
    });

    if (!timeGrid || timeGrid.periods.length === 0) {
      return [];
    }

    const roomIds = rooms.map((r) => r.id);
    const periods = timeGrid.periods;

    // Query TimetableLesson on active run for all rooms on this day. Newest
    // active wins (matches the timetable.service.getView ordering).
    const activeRun = await this.prisma.timetableRun.findFirst({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    let lessons: any[] = [];
    if (activeRun) {
      lessons = await this.prisma.timetableLesson.findMany({
        where: {
          runId: activeRun.id,
          roomId: { in: roomIds },
          dayOfWeek: query.dayOfWeek as any,
        },
        include: {
          // Join through to Subject for label
          // ClassSubject is not directly relatable via TimetableLesson (uses classSubjectId string)
          // We need a separate lookup
        },
      });
    }

    // Fetch classSubject -> subject mapping for lesson labels
    const classSubjectIds = [...new Set(lessons.map((l: any) => l.classSubjectId))];
    let subjectMap = new Map<string, string>();
    if (classSubjectIds.length > 0) {
      const classSubjects = await this.prisma.classSubject.findMany({
        where: { id: { in: classSubjectIds } },
        include: { subject: { select: { shortName: true } } },
      });
      subjectMap = new Map(classSubjects.map((cs) => [cs.id, cs.subject.shortName]));
    }

    // Query RoomBooking for all rooms on this day
    const bookings = await this.prisma.roomBooking.findMany({
      where: {
        roomId: { in: roomIds },
        dayOfWeek: query.dayOfWeek as any,
      },
    });

    // Build index maps for O(1) lookup
    const lessonIndex = new Map<string, any>();
    for (const lesson of lessons) {
      const key = `${lesson.roomId}:${lesson.periodNumber}:${lesson.weekType}`;
      lessonIndex.set(key, lesson);
      // Also index BOTH for A/B matching
      if (lesson.weekType === 'BOTH') {
        lessonIndex.set(`${lesson.roomId}:${lesson.periodNumber}:A`, lesson);
        lessonIndex.set(`${lesson.roomId}:${lesson.periodNumber}:B`, lesson);
      }
    }

    const bookingIndex = new Map<string, any>();
    for (const booking of bookings) {
      const key = `${booking.roomId}:${booking.periodNumber}:${booking.weekType}`;
      bookingIndex.set(key, booking);
      if (booking.weekType === 'BOTH') {
        bookingIndex.set(`${booking.roomId}:${booking.periodNumber}:A`, booking);
        bookingIndex.set(`${booking.roomId}:${booking.periodNumber}:B`, booking);
      }
    }

    // Build the grid: rooms x periods
    const slots: RoomAvailabilitySlotDto[] = [];
    for (const room of rooms) {
      for (const period of periods) {
        const key = `${room.id}:${period.periodNumber}:BOTH`;
        const lesson = lessonIndex.get(key);
        const booking = bookingIndex.get(key);

        const slot: RoomAvailabilitySlotDto = {
          roomId: room.id,
          roomName: room.name,
          roomType: room.roomType,
          capacity: room.capacity,
          dayOfWeek: query.dayOfWeek,
          periodNumber: period.periodNumber,
          isAvailable: !lesson && !booking,
        };

        if (lesson) {
          slot.occupiedBy = {
            type: 'lesson',
            label: subjectMap.get(lesson.classSubjectId) || 'Unterricht',
          };
        } else if (booking) {
          slot.occupiedBy = {
            type: 'booking',
            label: booking.purpose || 'Ad-hoc-Buchung',
            bookedBy: booking.bookedBy,
            bookingId: booking.id,
          };
        }

        slots.push(slot);
      }
    }

    return slots;
  }

  /**
   * Get bookings for a specific room, optionally filtered by day.
   */
  async getBookingsForRoom(
    roomId: string,
    dayOfWeek?: string,
  ): Promise<RoomBookingResponseDto[]> {
    const where: any = { roomId };
    if (dayOfWeek) {
      where.dayOfWeek = dayOfWeek;
    }

    const bookings = await this.prisma.roomBooking.findMany({
      where,
      include: { room: true },
      orderBy: { periodNumber: 'asc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      roomId: b.roomId,
      roomName: b.room.name,
      bookedBy: b.bookedBy,
      dayOfWeek: b.dayOfWeek,
      periodNumber: b.periodNumber,
      weekType: b.weekType,
      purpose: b.purpose,
      isAdHoc: b.isAdHoc,
      createdAt: b.createdAt.toISOString(),
    }));
  }
}
