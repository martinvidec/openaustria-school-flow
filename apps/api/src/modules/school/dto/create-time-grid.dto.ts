import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsInt, IsBoolean, IsOptional, IsArray, ValidateNested, Min, Matches } from 'class-validator';

export class CreatePeriodDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  periodNumber!: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty({ example: '08:50' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isBreak!: boolean;

  @ApiPropertyOptional({ example: '1. Stunde' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  durationMin!: number;
}

export class CreateTimeGridDto {
  @ApiProperty({ type: [CreatePeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePeriodDto)
  periods!: CreatePeriodDto[];
}
