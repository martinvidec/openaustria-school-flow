import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserContextService } from './user-context.service';
import { UserContextResponseDto } from './dto/user-context.dto';
import { RequestWithSchool } from '../auth/types/request-with-school';

@ApiTags('user-context')
@ApiBearerAuth()
@Controller('users')
export class UserContextController {
  constructor(private userContextService: UserContextService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user context (schoolId, role, classId, availableSchools)' })
  @ApiResponse({ status: 200, description: 'User context', type: UserContextResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'X-School-Id header not in user memberships' })
  @ApiResponse({ status: 404, description: 'Person record not found for user' })
  async getMe(@Req() req: RequestWithSchool): Promise<UserContextResponseDto> {
    return this.userContextService.getUserContext(req.user.id, req.currentSchoolId);
  }
}
