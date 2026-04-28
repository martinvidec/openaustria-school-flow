import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CategoryStatusDto,
  DashboardStatusDto,
  CategoryStatus,
  CategoryKey,
} from './dto/dashboard-status.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { DashboardModule } from './dashboard.module';

describe('Dashboard Module — DTO + skeleton', () => {
  describe('DashboardStatusDto / CategoryStatusDto', () => {
    it('exposes the CategoryStatus union and DashboardStatusDto class', () => {
      const dto = new DashboardStatusDto();
      dto.schoolId = 'school-1';
      dto.generatedAt = new Date().toISOString();
      const cat = new CategoryStatusDto();
      cat.key = 'school' as CategoryKey;
      cat.status = 'done' as CategoryStatus;
      cat.secondary = 'Stammdaten vollständig';
      dto.categories = [cat];

      expect(dto.schoolId).toBe('school-1');
      expect(dto.categories).toHaveLength(1);
      expect(dto.categories[0].key).toBe('school');
      expect(dto.categories[0].status).toBe('done');
    });
  });

  describe('QueryDashboardDto', () => {
    it('rejects missing schoolId', async () => {
      const dto = plainToInstance(QueryDashboardDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schoolId');
    });

    it('rejects non-UUID schoolId', async () => {
      const dto = plainToInstance(QueryDashboardDto, { schoolId: 'not-a-uuid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('schoolId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('accepts a valid UUID schoolId', async () => {
      const dto = plainToInstance(QueryDashboardDto, {
        schoolId: '11111111-1111-4111-8111-111111111111',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('DashboardModule registration', () => {
    it('exports a NestJS module class', () => {
      expect(DashboardModule).toBeDefined();
      // Reflect module metadata existence (decorator applied)
      const meta = Reflect.getMetadata('imports', DashboardModule);
      expect(Array.isArray(meta)).toBe(true);
    });
  });
});
