import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

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
}
