import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { StudentNoteService } from './student-note.service';
import { CreateStudentNoteDto, UpdateStudentNoteDto } from './dto/student-note.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('classbook')
@ApiBearerAuth()
@Controller('schools/:schoolId/classbook')
export class StudentNoteController {
  constructor(private readonly studentNoteService: StudentNoteService) {}

  /**
   * POST /schools/:schoolId/classbook/:entryId/notes
   * Create a note for a student on a ClassBookEntry.
   */
  @Post(':entryId/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a student note for a ClassBookEntry' })
  @ApiResponse({ status: 201, description: 'Student note created' })
  @ApiResponse({ status: 404, description: 'ClassBookEntry not found' })
  async createNote(
    @Param('entryId') entryId: string,
    @Body() dto: CreateStudentNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentNoteService.createNote(entryId, user.id, dto);
  }

  /**
   * GET /schools/:schoolId/classbook/:entryId/notes
   * Get all visible student notes for a ClassBookEntry (D-10 visibility filtering).
   */
  @Get(':entryId/notes')
  @ApiOperation({ summary: 'Get student notes for a ClassBookEntry (visibility-filtered)' })
  @ApiResponse({ status: 200, description: 'Visible student notes' })
  @ApiResponse({ status: 404, description: 'ClassBookEntry not found' })
  async getNotesForEntry(
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentNoteService.getNotesForEntry(entryId, user.id, user.roles);
  }

  /**
   * PATCH /schools/:schoolId/classbook/notes/:noteId
   * Update a student note (author only).
   */
  @Patch('notes/:noteId')
  @ApiOperation({ summary: 'Update a student note (author only)' })
  @ApiResponse({ status: 200, description: 'Student note updated' })
  @ApiResponse({ status: 403, description: 'Only the author can edit this note' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateStudentNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentNoteService.updateNote(noteId, user.id, dto);
  }

  /**
   * DELETE /schools/:schoolId/classbook/notes/:noteId
   * Delete a student note (author or admin/schulleitung).
   */
  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a student note (author or admin/schulleitung)' })
  @ApiResponse({ status: 204, description: 'Student note deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this note' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async deleteNote(
    @Param('noteId') noteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentNoteService.deleteNote(noteId, user.id, user.roles);
  }
}
