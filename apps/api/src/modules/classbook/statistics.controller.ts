import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { AbsenceStatisticsQueryDto, StudentAbsenceQueryDto } from './dto/statistics.dto';

@ApiTags('classbook')
@ApiBearerAuth()
@Controller('schools/:schoolId/classbook/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * GET /schools/:schoolId/classbook/statistics/class
   * Get per-class absence statistics (BOOK-05).
   * Aggregates per-student attendance with date range filtering.
   * Late >15min counted as absent per Austrian Schulunterrichtsgesetz (D-04).
   */
  @Get('class')
  @ApiOperation({ summary: 'Get per-class absence statistics (BOOK-05)' })
  @ApiResponse({ status: 200, description: 'Per-student absence statistics for the class' })
  async getClassStatistics(
    @Param('schoolId') schoolId: string,
    @Query() query: AbsenceStatisticsQueryDto,
  ) {
    return this.statisticsService.getClassStatistics(schoolId, query);
  }

  /**
   * GET /schools/:schoolId/classbook/statistics/student
   * Get single student absence statistics (parent/student view).
   */
  @Get('student')
  @ApiOperation({ summary: 'Get single student absence statistics' })
  @ApiResponse({ status: 200, description: 'Single student absence statistics' })
  async getStudentStatistics(
    @Param('schoolId') schoolId: string,
    @Query() query: StudentAbsenceQueryDto,
  ) {
    return this.statisticsService.getStudentStatistics(schoolId, query);
  }
}
