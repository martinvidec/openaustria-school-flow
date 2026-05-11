import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { CreateSubjectDto } from './create-subject.dto';

// Issue #69: kept in sync with the Prisma `RoomType` enum.
enum RoomTypeDto {
  KLASSENZIMMER = 'KLASSENZIMMER',
  TURNSAAL = 'TURNSAAL',
  EDV_RAUM = 'EDV_RAUM',
  WERKRAUM = 'WERKRAUM',
  LABOR = 'LABOR',
  MUSIKRAUM = 'MUSIKRAUM',
}

export class UpdateSubjectDto extends PartialType(
  OmitType(CreateSubjectDto, ['schoolId', 'requiredRoomType'] as const),
) {
  // Re-declare requiredRoomType so clients can pass explicit null to clear
  // the assignment. PartialType alone makes the field optional but
  // class-validator @IsEnum rejects null without ValidateIf.
  @ApiPropertyOptional({
    enum: RoomTypeDto,
    nullable: true,
    description: 'Required room type. Pass null to clear. Issue #69.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(RoomTypeDto)
  requiredRoomType?: RoomTypeDto | null;
}
