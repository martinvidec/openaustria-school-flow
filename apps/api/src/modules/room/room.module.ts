import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { TimetableModule } from '../timetable/timetable.module';
import { TimetableEventsGateway } from '../timetable/timetable-events.gateway';

@Module({
  imports: [TimetableModule],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private roomService: RoomService,
  ) {}

  /**
   * Wire the TimetableEventsGateway into RoomService after module init
   * to emit WebSocket events on room booking changes (D-16).
   */
  onModuleInit() {
    const gateway = this.moduleRef.get(TimetableEventsGateway, { strict: false });
    this.roomService.setTimetableEventsGateway(gateway);
  }
}
