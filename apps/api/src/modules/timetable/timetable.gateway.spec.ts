import { Test, TestingModule } from '@nestjs/testing';
import { TimetableGateway } from './timetable.gateway';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TimetableGateway', () => {
  let gateway: TimetableGateway;
  let mockServer: { to: ReturnType<typeof vi.fn> };
  let mockRoom: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRoom = { emit: vi.fn() };
    mockServer = { to: vi.fn().mockReturnValue(mockRoom) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimetableGateway],
    }).compile();

    gateway = module.get<TimetableGateway>(TimetableGateway);
    (gateway as any).server = mockServer;
  });

  it('should join school room on connection', () => {
    const mockClient = {
      id: 'client-1',
      handshake: { query: { schoolId: 'school-123' } },
      join: vi.fn(),
    };
    gateway.handleConnection(mockClient as any);
    expect(mockClient.join).toHaveBeenCalledWith('school:school-123');
  });

  it('should not join room if no schoolId provided', () => {
    const mockClient = {
      id: 'client-2',
      handshake: { query: {} },
      join: vi.fn(),
    };
    gateway.handleConnection(mockClient as any);
    expect(mockClient.join).not.toHaveBeenCalled();
  });

  it('should emit progress to correct school room', () => {
    const progress = {
      runId: 'run-1',
      hardScore: -2,
      softScore: -15,
      elapsedSeconds: 30,
      remainingViolations: [
        { type: 'Teacher conflict', count: 2, examples: ['Mueller: Mon P3'] },
      ],
      improvementRate: 'improving' as const,
      scoreHistory: [{ timestamp: 1000, hard: -5, soft: -30 }],
    };
    gateway.emitProgress('school-123', progress);
    expect(mockServer.to).toHaveBeenCalledWith('school:school-123');
    expect(mockRoom.emit).toHaveBeenCalledWith('solve:progress', progress);
  });

  it('should emit completion to correct school room', () => {
    const result = {
      runId: 'run-1',
      status: 'COMPLETED',
      hardScore: 0,
      softScore: -8,
      elapsedSeconds: 120,
    };
    gateway.emitComplete('school-123', result);
    expect(mockServer.to).toHaveBeenCalledWith('school:school-123');
    expect(mockRoom.emit).toHaveBeenCalledWith('solve:complete', result);
  });

  it('should handle disconnect without error', () => {
    const mockClient = { id: 'client-3' };
    // Should not throw
    expect(() => gateway.handleDisconnect(mockClient as any)).not.toThrow();
  });
});
