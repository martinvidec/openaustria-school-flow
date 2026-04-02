import { IsEnum, IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeekDto } from './room-booking.dto';
import { RoomTypeDto } from './create-room.dto';

export class RoomAvailabilityQueryDto {
  @IsEnum(DayOfWeekDto)
  dayOfWeek!: string;

  @IsOptional()
  @IsEnum(RoomTypeDto)
  roomType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @IsOptional()
  @IsString()
  equipment?: string; // comma-separated equipment tags
}

export class RoomAvailabilitySlotDto {
  roomId!: string;
  roomName!: string;
  roomType!: string;
  capacity!: number;
  dayOfWeek!: string;
  periodNumber!: number;
  isAvailable!: boolean;
  occupiedBy?: {
    type: 'lesson' | 'booking';
    label: string;
    bookedBy?: string;
    bookingId?: string;
  };
}
