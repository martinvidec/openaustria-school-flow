import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClassSubjectService } from './class-subject.service';
import { UpdateClassSubjectsDto } from './dto/update-class-subjects.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('class-subjects')
@ApiBearerAuth()
@Controller('classes/:classId/subjects')
export class ClassSubjectController {
  constructor(private service: ClassSubjectService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'List ClassSubject rows for a class' })
  async findByClass(@Param('classId') classId: string) {
    return this.service.findByClass(classId);
  }

  @Put()
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({
    summary:
      'Replace ALL ClassSubject rows for a class (Wochenstunden-Editor bulk save — SUBJECT-04)',
  })
  async update(
    @Param('classId') classId: string,
    @Body() dto: UpdateClassSubjectsDto,
  ) {
    return this.service.updateClassSubjects(classId, dto);
  }
}
