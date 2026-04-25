import { Test, TestingModule } from '@nestjs/testing';
import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
import { PrismaService } from '../../config/database/prisma.service';

describe('ConstraintWeightOverrideService', () => {
  it.todo('findBySchool returns Record<string, number>');
  it.todo('findOverridesOnly returns persisted overrides without defaults');
  it.todo('findLastUpdatedAt returns MAX(updatedAt) across school overrides');
  it.todo('bulkReplace deletes + creates in a single transaction');
  it.todo('bulkReplace rejects unknown constraint names with UnprocessableEntityException');
  it.todo('bulkReplace rejects weights outside 0..100 with UnprocessableEntityException');
  it.todo('resetOne removes a single row by [schoolId, constraintName]');
});
