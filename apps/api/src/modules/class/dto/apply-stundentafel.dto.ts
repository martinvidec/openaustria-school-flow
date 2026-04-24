import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ApplyStundentafelDto {
  @ApiProperty({
    description: 'Schultyp key (e.g., AHS_UNTER, AHS_OBER, NMS, VS, BHS)',
    example: 'AHS_UNTER',
  })
  @IsString()
  @MinLength(1)
  schoolType!: string;
}
