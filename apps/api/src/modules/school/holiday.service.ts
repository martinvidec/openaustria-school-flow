import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../config/database/generated/client.js';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateHolidayDto } from './dto/create-school-year.dto';

@Injectable()
export class HolidayService {
  constructor(private prisma: PrismaService) {}

  async create(schoolYearId: string, dto: CreateHolidayDto) {
    try {
      return await this.prisma.holiday.create({
        data: {
          schoolYearId,
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new NotFoundException('Schuljahr nicht gefunden.');
      }
      throw e;
    }
  }

  async remove(holidayId: string) {
    try {
      await this.prisma.holiday.delete({ where: { id: holidayId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Ferieneintrag nicht gefunden.');
      }
      throw e;
    }
  }
}
