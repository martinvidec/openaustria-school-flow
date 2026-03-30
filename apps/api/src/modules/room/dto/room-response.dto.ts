export class RoomResponseDto {
  id!: string;
  schoolId!: string;
  name!: string;
  roomType!: string;
  capacity!: number;
  equipment!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
