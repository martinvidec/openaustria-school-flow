import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CreateHolidayDto } from './dto/create-school-year.dto';
import { HolidayService } from './holiday.service';

@ApiTags('holidays')
@ApiBearerAuth()
@Controller('schools/:schoolId/school-years/:yearId/holidays')
export class HolidayController {
  constructor(private holidayService: HolidayService) {}

  @Post()
  @CheckPermissions({ action: 'manage', subject: 'school-year' })
  @ApiOperation({ summary: 'Add a holiday to the school year (D-08 nested sub-UI).' })
  @ApiResponse({ status: 201, description: 'Holiday created' })
  @ApiResponse({ status: 404, description: 'School year not found' })
  async create(@Param('yearId') yearId: string, @Body() dto: CreateHolidayDto) {
    return this.holidayService.create(yearId, dto);
  }

  @Delete(':holidayId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'school-year' })
  @ApiOperation({ summary: 'Remove a holiday from the school year.' })
  @ApiResponse({ status: 204, description: 'Holiday removed' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  async remove(@Param('holidayId') holidayId: string) {
    await this.holidayService.remove(holidayId);
  }
}
