import { IsUUID, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum DayOfWeekDto {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

export class CreateRoomBookingDto {
  @IsUUID()
  roomId!: string;

  @IsEnum(DayOfWeekDto)
  dayOfWeek!: string;

  @IsInt()
  @Min(1)
  periodNumber!: number;

  @IsOptional()
  @IsString()
  weekType?: string; // defaults to 'BOTH'

  @IsOptional()
  @IsString()
  @MaxLength(255)
  purpose?: string;
}

export class RoomBookingResponseDto {
  id!: string;
  roomId!: string;
  roomName!: string;
  bookedBy!: string;
  bookedByName?: string;
  dayOfWeek!: string;
  periodNumber!: number;
  weekType!: string;
  purpose!: string | null;
  isAdHoc!: boolean;
  createdAt!: string;
}
