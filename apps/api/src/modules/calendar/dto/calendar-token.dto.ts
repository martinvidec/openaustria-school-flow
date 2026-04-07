import { ApiProperty } from '@nestjs/swagger';

export class CalendarTokenResponseDto {
  @ApiProperty({ description: 'Token record ID' })
  id!: string;

  @ApiProperty({ description: 'The calendar subscription token' })
  token!: string;

  @ApiProperty({ description: 'Full URL for calendar subscription' })
  calendarUrl!: string;

  @ApiProperty({ description: 'Token creation timestamp' })
  createdAt!: string;
}
