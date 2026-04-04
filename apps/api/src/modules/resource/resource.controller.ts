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
import { ResourceService } from './resource.service';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { CreateResourceBookingDto } from './dto/resource-booking.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('resources')
@ApiBearerAuth()
@Controller('schools/:schoolId/resources')
export class ResourceController {
  constructor(private resourceService: ResourceService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'resource' })
  @ApiOperation({ summary: 'Create a new resource for a school (ROOM-04)' })
  @ApiResponse({ status: 201, description: 'Resource created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Resource name already exists' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateResourceDto,
  ) {
    return this.resourceService.create(schoolId, dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'resource' })
  @ApiOperation({ summary: 'List all resources for a school' })
  @ApiResponse({ status: 200, description: 'List of resources' })
  async findAll(@Param('schoolId') schoolId: string) {
    return this.resourceService.findAll(schoolId);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'resource' })
  @ApiOperation({ summary: 'Get a resource by ID' })
  @ApiResponse({ status: 200, description: 'Resource found' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }

  @Patch(':id')
  @CheckPermissions({ action: 'update', subject: 'resource' })
  @ApiOperation({ summary: 'Update a resource' })
  @ApiResponse({ status: 200, description: 'Resource updated' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 409, description: 'Resource name already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resourceService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'resource' })
  @ApiOperation({ summary: 'Delete a resource' })
  @ApiResponse({ status: 204, description: 'Resource deleted' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(@Param('id') id: string) {
    await this.resourceService.remove(id);
  }

  @Post('bookings')
  @CheckPermissions({ action: 'create', subject: 'resource-booking' })
  @ApiOperation({ summary: 'Book a resource for a period' })
  @ApiResponse({ status: 201, description: 'Resource booked' })
  @ApiResponse({ status: 409, description: 'Resource already booked' })
  async bookResource(
    @Body() dto: CreateResourceBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourceService.bookResource(dto, user.id);
  }

  @Delete('bookings/:bookingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'resource-booking' })
  @ApiOperation({ summary: 'Cancel a resource booking' })
  @ApiResponse({ status: 204, description: 'Booking cancelled' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelResourceBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.resourceService.cancelResourceBooking(bookingId, user.id, user.roles);
  }
}
