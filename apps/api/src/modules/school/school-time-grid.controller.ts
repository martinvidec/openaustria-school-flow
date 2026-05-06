import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { UpdateTimeGridDto } from './dto/update-time-grid.dto';
import { SchoolTimeGridService } from './school-time-grid.service';

@ApiTags('school-time-grid')
@ApiBearerAuth()
@Controller('schools/:schoolId/time-grid')
export class SchoolTimeGridController {
  constructor(private timeGridService: SchoolTimeGridService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'school' })
  @ApiOperation({
    summary: 'Read the time grid for a school (periods + Mo-Sa Schultage mask).',
  })
  @ApiResponse({ status: 200, description: 'Time grid found' })
  @ApiResponse({ status: 404, description: 'No time grid configured yet' })
  async findOne(@Param('schoolId') schoolId: string) {
    const grid = await this.timeGridService.findOne(schoolId);
    if (!grid) {
      throw new NotFoundException('Zeitraster nicht gefunden.');
    }
    return grid;
  }

  @Put()
  @CheckPermissions({ action: 'update', subject: 'school' })
  @ApiOperation({
    summary: 'Update the time grid (D-11 periods + D-14 Schultage). Pass ?force=true to override D-13 impact-check.',
  })
  @ApiResponse({ status: 200, description: 'Time grid updated' })
  @ApiResponse({
    status: 409,
    description: 'Active runs reference removed periods (D-13). Body includes impactedRunsCount.',
  })
  async update(
    @Param('schoolId') schoolId: string,
    @Body() dto: UpdateTimeGridDto,
    @Query('force') force?: string,
  ) {
    return this.timeGridService.update(schoolId, dto, { force: force === 'true' });
  }
}
