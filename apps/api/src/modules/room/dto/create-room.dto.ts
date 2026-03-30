import { IsString, IsEnum, IsInt, IsArray, IsOptional, Min, MaxLength } from 'class-validator';

export enum RoomTypeDto {
  KLASSENZIMMER = 'KLASSENZIMMER',
  TURNSAAL = 'TURNSAAL',
  EDV_RAUM = 'EDV_RAUM',
  WERKRAUM = 'WERKRAUM',
  LABOR = 'LABOR',
  MUSIKRAUM = 'MUSIKRAUM',
}

export class CreateRoomDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(RoomTypeDto)
  roomType!: RoomTypeDto;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipment?: string[];
}
