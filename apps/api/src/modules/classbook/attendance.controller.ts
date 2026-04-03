import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto, CreateClassBookEntryDto } from './dto/attendance.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('classbook')
@ApiBearerAuth()
@Controller('schools/:schoolId/classbook')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or get a ClassBookEntry for a lesson occurrence' })
  @ApiResponse({ status: 201, description: 'ClassBookEntry created or retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async getOrCreateEntry(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateClassBookEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getOrCreateEntry(schoolId, user.id, dto);
  }

  @Get(':entryId/attendance')
  @ApiOperation({ summary: 'Get attendance records for a ClassBookEntry' })
  @ApiResponse({ status: 200, description: 'Attendance records with student names' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async getAttendance(@Param('entryId') entryId: string) {
    return this.attendanceService.getAttendanceForEntry(entryId);
  }

  @Put(':entryId/attendance')
  @ApiOperation({ summary: 'Bulk update attendance records for a ClassBookEntry' })
  @ApiResponse({ status: 200, description: 'Updated attendance records' })
  @ApiResponse({ status: 400, description: 'Invalid input (e.g., lateMinutes on non-LATE)' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async bulkUpdateAttendance(
    @Param('entryId') entryId: string,
    @Body() dto: BulkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.bulkUpdateAttendance(entryId, user.id, dto);
  }

  @Post(':entryId/attendance/all-present')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set all students in a ClassBookEntry to present (Alle anwesend)' })
  @ApiResponse({ status: 200, description: 'All students set to present' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async setAllPresent(
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.setAllPresent(entryId, user.id);
  }
}
