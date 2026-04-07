import { describe, it } from 'vitest';

describe('PollService', () => {
  // COMM-06: Polls
  it.todo('creates Poll with SINGLE_CHOICE type and 2-10 PollOption rows');
  it.todo('creates Poll with MULTIPLE_CHOICE type');
  it.todo('casts a vote creating PollVote row (single choice replaces previous vote)');
  it.todo('casts multiple votes for MULTIPLE_CHOICE poll');
  it.todo('rejects vote on closed poll or past deadline');
  it.todo('returns named voters for sender/admin, anonymous aggregated counts for others (D-10)');
});
