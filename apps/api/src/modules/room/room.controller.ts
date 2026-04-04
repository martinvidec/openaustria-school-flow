import {
  Controller,
  Get,
  Post,
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
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateRoomBookingDto } from './dto/room-booking.dto';
import { RoomAvailabilityQueryDto } from './dto/room-availability.dto';

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('schools/:schoolId/rooms')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'room' })
  @ApiOperation({ summary: 'Create a new room for a school' })
  @ApiResponse({ status: 201, description: 'Room created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomService.create(schoolId, dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'room' })
  @ApiOperation({ summary: 'List rooms for a school with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of rooms' })
  async findAll(
    @Param('schoolId') schoolId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.roomService.findAll(schoolId, pagination);
  }

  @Get('availability')
  @CheckPermissions({ action: 'read', subject: 'room' })
  @ApiOperation({ summary: 'Get room availability grid for a given day (D-13)' })
  @ApiResponse({ status: 200, description: 'Room availability grid' })
  async getAvailability(
    @Param('schoolId') schoolId: string,
    @Query() query: RoomAvailabilityQueryDto,
  ) {
    return this.roomService.getAvailability(schoolId, query);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'room' })
  @ApiOperation({ summary: 'Get a room by ID' })
  @ApiResponse({ status: 200, description: 'Room found' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(@Param('id') id: string) {
    return this.roomService.findOne(id);
  }

  @Get(':id/bookings')
  @CheckPermissions({ action: 'read', subject: 'room' })
  @ApiOperation({ summary: 'Get bookings for a specific room' })
  @ApiResponse({ status: 200, description: 'List of room bookings' })
  async getBookings(
    @Param('id') roomId: string,
    @Query('dayOfWeek') dayOfWeek?: string,
  ) {
    return this.roomService.getBookingsForRoom(roomId, dayOfWeek);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'room' })
  @ApiOperation({ summary: 'Update a room' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'room' })
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 204, description: 'Room deleted' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async remove(@Param('id') id: string) {
    await this.roomService.remove(id);
  }

  @Post('bookings')
  @CheckPermissions({ action: 'create', subject: 'room-booking' })
  @ApiOperation({ summary: 'Book a room for ad-hoc usage (ROOM-03)' })
  @ApiResponse({ status: 201, description: 'Room booked' })
  @ApiResponse({ status: 409, description: 'Room already occupied' })
  async bookRoom(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateRoomBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomService.bookRoom(schoolId, dto, user.id);
  }

  @Delete('bookings/:bookingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'room-booking' })
  @ApiOperation({ summary: 'Cancel a room booking' })
  @ApiResponse({ status: 204, description: 'Booking cancelled' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(
    @Param('schoolId') schoolId: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.roomService.cancelBooking(schoolId, bookingId, user.id, user.roles);
  }
}
