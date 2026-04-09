import { describe, it, expect, vi } from 'vitest';
import { PushProcessor } from './push.processor';
import { PushService } from './push.service';
import type { Job } from 'bullmq';

/**
 * MOBILE-02 -- PushProcessor BullMQ worker tests.
 *
 * The processor is a thin adapter that reads job.data and forwards to
 * pushService.sendToUser(). The only custom behavior is swallowing errors
 * (push delivery failures should NOT cause BullMQ to retry forever — the
 * device may come back online and get a stale notification anyway).
 */

function createProcessor() {
  const pushServiceMock = {
    sendToUser: vi.fn().mockResolvedValue(undefined),
  };
  const processor = new PushProcessor(
    pushServiceMock as unknown as PushService,
  );
  return { processor, pushServiceMock };
}

function createJob(
  data: Parameters<PushProcessor['process']>[0]['data'],
): Parameters<PushProcessor['process']>[0] {
  return { data } as unknown as Parameters<PushProcessor['process']>[0];
}

describe('PushProcessor (MOBILE-02)', () => {
  // Wave 0 — it.todo stubs from plan behavior list
  it.todo('PushProcessor.process() calls pushService.sendToUser with job data');
  it.todo('PushProcessor.process() handles sendToUser errors gracefully');

  it('process() calls pushService.sendToUser with userId + payload from job.data', async () => {
    const { processor, pushServiceMock } = createProcessor();
    const job = createJob({
      userId: 'user-1',
      payload: {
        title: 'Neue Nachricht',
        body: 'Hr. Mueller hat Ihnen geschrieben',
        url: '/messages/conv-1',
        tag: 'message-conv-1',
      },
    });

    await processor.process(job);

    expect(pushServiceMock.sendToUser).toHaveBeenCalledOnce();
    expect(pushServiceMock.sendToUser).toHaveBeenCalledWith('user-1', {
      title: 'Neue Nachricht',
      body: 'Hr. Mueller hat Ihnen geschrieben',
      url: '/messages/conv-1',
      tag: 'message-conv-1',
    });
  });

  it('process() handles sendToUser errors gracefully (logs, does not rethrow)', async () => {
    const { processor, pushServiceMock } = createProcessor();
    pushServiceMock.sendToUser.mockRejectedValue(new Error('web-push explode'));
    const job = createJob({
      userId: 'user-1',
      payload: { title: 't', body: 'b' },
    });

    // The processor intentionally does NOT rethrow — rethrowing would make
    // BullMQ retry the job indefinitely, which is pointless for push delivery
    // because TTL expiry already handles the "device offline" case.
    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(pushServiceMock.sendToUser).toHaveBeenCalledOnce();
  });
});
