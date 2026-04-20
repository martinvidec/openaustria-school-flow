import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CreateAutonomousDayDto } from './dto/create-school-year.dto';
import { AutonomousDayService } from './autonomous-day.service';

@ApiTags('autonomous-days')
@ApiBearerAuth()
@Controller('schools/:schoolId/school-years/:yearId/autonomous-days')
export class AutonomousDayController {
  constructor(private autonomousDayService: AutonomousDayService) {}

  @Post()
  @CheckPermissions({ action: 'manage', subject: 'school-year' })
  @ApiOperation({ summary: 'Add an autonomous day to the school year (D-08 nested sub-UI).' })
  @ApiResponse({ status: 201, description: 'Autonomous day created' })
  @ApiResponse({ status: 404, description: 'School year not found' })
  async create(@Param('yearId') yearId: string, @Body() dto: CreateAutonomousDayDto) {
    return this.autonomousDayService.create(yearId, dto);
  }

  @Delete(':dayId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'school-year' })
  @ApiOperation({ summary: 'Remove an autonomous day from the school year.' })
  @ApiResponse({ status: 204, description: 'Autonomous day removed' })
  @ApiResponse({ status: 404, description: 'Autonomous day not found' })
  async remove(@Param('dayId') dayId: string) {
    await this.autonomousDayService.remove(dayId);
  }
}
