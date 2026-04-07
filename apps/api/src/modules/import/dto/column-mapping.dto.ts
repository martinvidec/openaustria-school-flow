import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for CSV column mapping configuration.
 * Maps source column headers (from CSV) to SchoolFlow target fields.
 *
 * Example: { "Nachname": "lastName", "Vorname": "firstName", "Klasse": "className" }
 */
export class ColumnMappingDto {
  @ApiProperty({
    description: 'Mapping of source column name -> SchoolFlow target field',
    example: { Nachname: 'lastName', Vorname: 'firstName', Klasse: 'className' },
  })
  @IsObject()
  mapping!: Record<string, string>;
}
