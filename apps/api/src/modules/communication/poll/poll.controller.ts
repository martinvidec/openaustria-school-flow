import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { CastVoteDto } from '../dto/poll.dto';
import { PollService } from './poll.service';

/**
 * Phase 7 Plan 03 -- Poll REST API (COMM-06).
 *
 * Endpoints for voting, retracting votes, closing polls, and viewing results.
 * Poll creation is handled via PollService.createWithMessage (called from
 * ConversationController or MessageController when pollData is present).
 */
@ApiTags('Communication')
@ApiBearerAuth()
@Controller('schools/:schoolId/polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post(':pollId/votes')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'create', subject: 'poll' })
  @ApiOperation({ summary: 'Cast vote on a poll (COMM-06, D-09)' })
  @ApiResponse({ status: 200, description: 'Vote cast, updated poll returned' })
  @ApiResponse({ status: 400, description: 'Poll closed or invalid option' })
  @ApiResponse({ status: 403, description: 'Not a member of the conversation' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async castVote(
    @Param('pollId') pollId: string,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pollService.castVote(pollId, user.id, dto);
  }

  @Delete(':pollId/votes')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'create', subject: 'poll' })
  @ApiOperation({ summary: 'Retract all votes from a poll' })
  @ApiResponse({ status: 200, description: 'Votes retracted, updated poll returned' })
  @ApiResponse({ status: 400, description: 'Poll is closed' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async retractVote(
    @Param('pollId') pollId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pollService.retractVote(pollId, user.id);
  }

  @Patch(':pollId/close')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'manage', subject: 'poll' })
  @ApiOperation({ summary: 'Close a poll manually (D-11)' })
  @ApiResponse({ status: 200, description: 'Poll closed, final results returned' })
  @ApiResponse({ status: 403, description: 'Only sender or admin can close' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async closePoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pollService.closePoll(pollId, user.id, user.roles);
  }

  @Get(':pollId/results')
  @CheckPermissions({ action: 'read', subject: 'poll' })
  @ApiOperation({ summary: 'Get poll results: named for sender/admin, anonymous for others (D-10)' })
  @ApiResponse({ status: 200, description: 'Poll results with vote counts' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async getResults(
    @Param('pollId') pollId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pollService.getResults(pollId, user.id, user.roles);
  }
}
