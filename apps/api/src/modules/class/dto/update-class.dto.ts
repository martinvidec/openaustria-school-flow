import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(
  OmitType(CreateClassDto, ['schoolId', 'schoolYearId'] as const),
) {}
