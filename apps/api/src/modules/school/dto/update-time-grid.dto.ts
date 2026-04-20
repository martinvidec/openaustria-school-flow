import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { CreatePeriodDto, CreateTimeGridDto } from './create-time-grid.dto';

enum DayOfWeekDto {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

export class UpdateTimeGridDto extends PartialType(CreateTimeGridDto) {
  @ApiPropertyOptional({
    description: 'Aktivierte Schultage (Mo-Sa). Replaces the stored set atomically on save (D-14).',
    enum: DayOfWeekDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeekDto, { each: true })
  schoolDays?: DayOfWeekDto[];
}

export { CreatePeriodDto };
