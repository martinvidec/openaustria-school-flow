import { IsUUID, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DayOfWeekDto } from '../../room/dto/room-booking.dto';

export class CreateResourceBookingDto {
  @IsUUID()
  resourceId!: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsEnum(DayOfWeekDto)
  dayOfWeek!: string;

  @IsInt()
  @Min(1)
  periodNumber!: number;

  @IsOptional()
  @IsString()
  weekType?: string;
}

export class ResourceBookingResponseDto {
  id!: string;
  resourceId!: string;
  resourceName!: string;
  roomId!: string | null;
  bookedBy!: string;
  dayOfWeek!: string;
  periodNumber!: number;
  weekType!: string;
  createdAt!: string;
}
