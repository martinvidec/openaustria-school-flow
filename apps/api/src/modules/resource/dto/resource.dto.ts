import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateResourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  resourceType!: string; // "TABLET_CART", "LAB_EQUIPMENT", "BEAMER", etc.

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}

export class ResourceResponseDto {
  id!: string;
  schoolId!: string;
  name!: string;
  resourceType!: string;
  description!: string | null;
  quantity!: number;
  createdAt!: string;
  updatedAt!: string;
}
