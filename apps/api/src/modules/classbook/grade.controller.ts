import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GradeService } from './grade.service';
import {
  CreateGradeEntryDto,
  UpdateGradeEntryDto,
  UpdateGradeWeightDto,
  GradeMatrixQueryDto,
} from './dto/grade.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('classbook')
@ApiBearerAuth()
@Controller('schools/:schoolId/classbook/grades')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  /**
   * POST /schools/:schoolId/classbook/grades
   * Create a new grade entry for a student.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a grade entry (Austrian 1-5 Notensystem)' })
  @ApiResponse({ status: 201, description: 'Grade entry created' })
  @ApiResponse({ status: 400, description: 'Invalid grade value or input' })
  async createGrade(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateGradeEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gradeService.createGrade(schoolId, user.id, dto);
  }

  /**
   * PATCH /schools/:schoolId/classbook/grades/:gradeId
   * Update an existing grade entry.
   */
  @Patch(':gradeId')
  @ApiOperation({ summary: 'Update a grade entry' })
  @ApiResponse({ status: 200, description: 'Grade entry updated' })
  @ApiResponse({ status: 400, description: 'Invalid grade value' })
  @ApiResponse({ status: 404, description: 'Grade entry not found' })
  async updateGrade(
    @Param('gradeId') gradeId: string,
    @Body() dto: UpdateGradeEntryDto,
  ) {
    return this.gradeService.updateGrade(gradeId, dto);
  }

  /**
   * DELETE /schools/:schoolId/classbook/grades/:gradeId
   * Delete a grade entry.
   */
  @Delete(':gradeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a grade entry' })
  @ApiResponse({ status: 204, description: 'Grade entry deleted' })
  @ApiResponse({ status: 404, description: 'Grade entry not found' })
  async deleteGrade(@Param('gradeId') gradeId: string) {
    return this.gradeService.deleteGrade(gradeId);
  }

  /**
   * GET /schools/:schoolId/classbook/grades/matrix/:classSubjectId
   * Get the grade matrix for a classSubject (D-07).
   * Students as rows, grade columns, weighted averages.
   */
  @Get('matrix/:classSubjectId')
  @ApiOperation({ summary: 'Get grade matrix for a classSubject (D-07)' })
  @ApiResponse({ status: 200, description: 'Grade matrix with weighted averages' })
  @ApiResponse({ status: 404, description: 'ClassSubject not found' })
  async getGradeMatrix(
    @Param('schoolId') schoolId: string,
    @Param('classSubjectId') classSubjectId: string,
    @Query() query: GradeMatrixQueryDto,
  ) {
    return this.gradeService.getGradeMatrix(schoolId, classSubjectId, query);
  }

  /**
   * PUT /schools/:schoolId/classbook/grades/weights/:classSubjectId
   * Update grade category weights for a classSubject (D-06).
   */
  @Put('weights/:classSubjectId')
  @ApiOperation({ summary: 'Update grade weights for a classSubject (D-06)' })
  @ApiResponse({ status: 200, description: 'Grade weights updated' })
  @ApiResponse({ status: 400, description: 'Weights must sum to 100' })
  async updateWeights(
    @Param('schoolId') schoolId: string,
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: UpdateGradeWeightDto,
  ) {
    return this.gradeService.updateWeights(schoolId, classSubjectId, dto);
  }

  /**
   * GET /schools/:schoolId/classbook/grades/weights/:classSubjectId
   * Get resolved grade weights for a classSubject (hierarchy: override > default > hardcoded).
   */
  @Get('weights/:classSubjectId')
  @ApiOperation({ summary: 'Get resolved grade weights for a classSubject' })
  @ApiResponse({ status: 200, description: 'Resolved grade weights' })
  async getWeights(
    @Param('schoolId') schoolId: string,
    @Param('classSubjectId') classSubjectId: string,
  ) {
    return this.gradeService.resolveWeights(schoolId, classSubjectId);
  }
}
