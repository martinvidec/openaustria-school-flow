import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamResponseDto } from './exam-response.dto';

export class ExamCollisionResponseDto {
  @ApiProperty({ description: 'Whether another exam exists on the same day for the same class' })
  hasCollision!: boolean;

  @ApiPropertyOptional({ description: 'The existing exam that conflicts', type: ExamResponseDto })
  existingExam?: ExamResponseDto;
}
