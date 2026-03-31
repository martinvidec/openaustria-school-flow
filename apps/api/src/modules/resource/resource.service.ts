import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateResourceDto, UpdateResourceDto, ResourceResponseDto } from './dto/resource.dto';
import { CreateResourceBookingDto, ResourceBookingResponseDto } from './dto/resource-booking.dto';

@Injectable()
export class ResourceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new resource for a school (ROOM-04).
   */
  async create(schoolId: string, dto: CreateResourceDto): Promise<ResourceResponseDto> {
    // Check unique constraint: schoolId + name
    const existing = await this.prisma.resource.findUnique({
      where: { schoolId_name: { schoolId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Eine Ressource mit dem Namen "${dto.name}" existiert bereits an dieser Schule.`,
      );
    }

    const resource = await this.prisma.resource.create({
      data: {
        schoolId,
        name: dto.name,
        resourceType: dto.resourceType,
        description: dto.description ?? null,
        quantity: dto.quantity ?? 1,
      },
    });

    return this.toResponseDto(resource);
  }

  /**
   * List all resources for a school.
   */
  async findAll(schoolId: string): Promise<ResourceResponseDto[]> {
    const resources = await this.prisma.resource.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    return resources.map((r) => this.toResponseDto(r));
  }

  /**
   * Get a single resource by ID.
   */
  async findOne(id: string): Promise<ResourceResponseDto> {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new NotFoundException('Ressource nicht gefunden.');
    }
    return this.toResponseDto(resource);
  }

  /**
   * Update a resource.
   */
  async update(id: string, dto: UpdateResourceDto): Promise<ResourceResponseDto> {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Ressource nicht gefunden.');
    }

    // Check name uniqueness if name changed
    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.prisma.resource.findUnique({
        where: { schoolId_name: { schoolId: existing.schoolId, name: dto.name } },
      });
      if (conflict) {
        throw new ConflictException(
          `Eine Ressource mit dem Namen "${dto.name}" existiert bereits an dieser Schule.`,
        );
      }
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.resourceType !== undefined && { resourceType: dto.resourceType }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Delete a resource. Cascades to ResourceBooking via onDelete: Cascade.
   */
  async remove(id: string): Promise<void> {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new NotFoundException('Ressource nicht gefunden.');
    }
    await this.prisma.resource.delete({ where: { id } });
  }

  /**
   * Book a resource for a room + period combination.
   */
  async bookResource(
    dto: CreateResourceBookingDto,
    userId: string,
  ): Promise<ResourceBookingResponseDto> {
    // Verify resource exists
    const resource = await this.prisma.resource.findUnique({ where: { id: dto.resourceId } });
    if (!resource) {
      throw new NotFoundException('Ressource nicht gefunden.');
    }

    const weekType = dto.weekType || 'BOTH';

    // Check for conflict on unique constraint
    const existing = await this.prisma.resourceBooking.findFirst({
      where: {
        resourceId: dto.resourceId,
        dayOfWeek: dto.dayOfWeek as any,
        periodNumber: dto.periodNumber,
        OR: [
          { weekType },
          { weekType: 'BOTH' },
          ...(weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
        ],
      },
    });
    if (existing) {
      throw new ConflictException(
        'Diese Ressource ist fuer die gewaehlte Zeit bereits gebucht.',
      );
    }

    const booking = await this.prisma.resourceBooking.create({
      data: {
        resourceId: dto.resourceId,
        roomId: dto.roomId ?? null,
        bookedBy: userId,
        dayOfWeek: dto.dayOfWeek as any,
        periodNumber: dto.periodNumber,
        weekType,
      },
      include: { resource: true },
    });

    return {
      id: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resource.name,
      roomId: booking.roomId,
      bookedBy: booking.bookedBy,
      dayOfWeek: booking.dayOfWeek,
      periodNumber: booking.periodNumber,
      weekType: booking.weekType,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  /**
   * Cancel a resource booking with ownership check.
   */
  async cancelResourceBooking(
    bookingId: string,
    userId: string,
    userRoles: string[],
  ): Promise<void> {
    const booking = await this.prisma.resourceBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Buchung nicht gefunden.');
    }

    const isOwner = booking.bookedBy === userId;
    const isAdmin = userRoles.some((r) =>
      ['admin', 'schulleitung', 'realm-admin'].includes(r.toLowerCase()),
    );
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Nur der Ersteller oder ein Administrator kann diese Buchung stornieren.',
      );
    }

    await this.prisma.resourceBooking.delete({ where: { id: bookingId } });
  }

  private toResponseDto(resource: any): ResourceResponseDto {
    return {
      id: resource.id,
      schoolId: resource.schoolId,
      name: resource.name,
      resourceType: resource.resourceType,
      description: resource.description,
      quantity: resource.quantity,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }
}
