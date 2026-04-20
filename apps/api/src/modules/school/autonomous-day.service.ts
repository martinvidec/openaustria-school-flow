import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../config/database/generated/client.js';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateAutonomousDayDto } from './dto/create-school-year.dto';

@Injectable()
export class AutonomousDayService {
  constructor(private prisma: PrismaService) {}

  async create(schoolYearId: string, dto: CreateAutonomousDayDto) {
    try {
      return await this.prisma.autonomousDay.create({
        data: {
          schoolYearId,
          date: new Date(dto.date),
          reason: dto.reason ?? null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new NotFoundException('Schuljahr nicht gefunden.');
      }
      throw e;
    }
  }

  async remove(dayId: string) {
    try {
      await this.prisma.autonomousDay.delete({ where: { id: dayId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Schulautonomer Tag nicht gefunden.');
      }
      throw e;
    }
  }
}
