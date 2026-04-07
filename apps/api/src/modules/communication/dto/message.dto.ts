import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message body text' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class MarkReadDto {
  @ApiProperty({ description: 'Array of message IDs to mark as read', type: [String] })
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];
}
