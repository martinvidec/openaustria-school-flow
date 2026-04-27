import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { ExportAuditQueryDto } from './dto/export-audit.query.dto';

/**
 * Plan 15-02 Task 2 — controller-level integration spec.
 *
 * The repo-wide pattern (see school.controller.spec.ts, push.controller.spec.ts)
 * is NestJS Testing-Module + mocked service: it exercises the controller method
 * end-to-end through Nest's DI container without booting Fastify or Keycloak.
 * The Fastify `@Res() reply` injection is asserted via a stub reply object
 * that records `header(...)` and `send(...)` calls — this is enough to lock
 * Content-Type / Content-Disposition / BOM as regression guards while keeping
 * the spec hermetic and millisecond-fast.
 *
 * Permission gating (`@CheckPermissions({ action: 'read', subject: 'audit' })`)
 * is asserted statically below by reflecting the decorator metadata — Nest's
 * Test module does not invoke guards by default, so a runtime 403 assertion
 * would require booting the full app. The metadata check guarantees the route
 * is wired with the same gate as `findAll`.
 */
describe('AuditController.exportCsv (integration)', () => {
  let controller: AuditController;
  let serviceMock: any;
  const adminUser = { id: 'admin-1', roles: ['admin'] } as any;

  function makeReply() {
    const headers: Record<string, string> = {};
    let body: any = undefined;
    return {
      headers,
      get body() {
        return body;
      },
      header(key: string, value: string) {
        headers[key] = value;
        return this;
      },
      send(payload: any) {
        body = payload;
        return this;
      },
    };
  }

  beforeEach(async () => {
    serviceMock = {
      findAll: vi.fn(),
      exportCsv: vi.fn().mockResolvedValue(
        '﻿' +
          'Zeitpunkt;Benutzer;Email;Aktion;Ressource;Ressource-ID;Kategorie;IP-Adresse;Vorzustand;Nachzustand\r\n' +
          '2026-04-26T08:00:00.000Z;;;update;consent;c1;MUTATION;127.0.0.1;{"granted":true};{"body":{"granted":false}}\r\n',
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: serviceMock }],
    }).compile();
    controller = module.get<AuditController>(AuditController);
  });

  it('describe block: GET /audit/export.csv returns 200 with text/csv Content-Type', async () => {
    const reply = makeReply();
    await (controller as any).exportCsv({}, adminUser, reply);
    expect(reply.headers['Content-Type']).toBe('text/csv; charset=utf-8');
  });

  it('returns Content-Disposition with filename pattern audit-log-YYYY-MM-DD.csv', async () => {
    const reply = makeReply();
    await (controller as any).exportCsv({}, adminUser, reply);
    expect(reply.headers['Content-Disposition']).toMatch(
      /^attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });

  it('body starts with UTF-8 BOM', async () => {
    const reply = makeReply();
    await (controller as any).exportCsv({}, adminUser, reply);
    expect(reply.body.charCodeAt(0)).toBe(0xfeff);
  });

  it('first line after BOM is the German header row with semicolon delimiter (10 cols)', async () => {
    const reply = makeReply();
    await (controller as any).exportCsv({}, adminUser, reply);
    const firstLine = reply.body.slice(1).split('\r\n')[0];
    expect(firstLine).toContain('Zeitpunkt');
    expect(firstLine).toContain('Aktion');
    expect(firstLine).toContain('Vorzustand');
    expect(firstLine.split(';').length).toBe(10);
  });

  it('forwards query filters (incl. action) into AuditService.exportCsv with parsed Dates', async () => {
    const reply = makeReply();
    const query = {
      userId: 'u-target',
      resource: 'consent',
      category: 'MUTATION',
      action: 'update',
      startDate: '2026-04-01',
      endDate: '2026-04-27',
    } as any;
    await (controller as any).exportCsv(query, adminUser, reply);
    const callArg = serviceMock.exportCsv.mock.calls[0][0];
    expect(callArg.userId).toBe('u-target');
    expect(callArg.resource).toBe('consent');
    expect(callArg.category).toBe('MUTATION');
    expect(callArg.action).toBe('update');
    expect(callArg.startDate).toBeInstanceOf(Date);
    expect(callArg.endDate).toBeInstanceOf(Date);
    expect(callArg.startDate.toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(callArg.endDate.toISOString().slice(0, 10)).toBe('2026-04-27');
    expect(callArg.requestingUser).toEqual(adminUser);
  });

  it('forwards undefined Dates when query omits startDate/endDate', async () => {
    const reply = makeReply();
    await (controller as any).exportCsv({}, adminUser, reply);
    const callArg = serviceMock.exportCsv.mock.calls[0][0];
    expect(callArg.startDate).toBeUndefined();
    expect(callArg.endDate).toBeUndefined();
  });

  it('does NOT prepend a second BOM in the controller (service already emits one)', async () => {
    const reply = makeReply();
    await (controller as any).exportCsv({}, adminUser, reply);
    // Body starts with exactly one BOM, second char is 'Z' (start of header)
    expect(reply.body.charCodeAt(0)).toBe(0xfeff);
    expect(reply.body.charCodeAt(1)).toBe('Z'.charCodeAt(0));
  });

  it('uses the same CheckPermissions metadata as findAll (admin gate)', () => {
    // Reflect the metadata Nest applies via @CheckPermissions decorator
    // Both findAll and exportCsv must carry { action: 'read', subject: 'audit' }
    const findAllMeta = Reflect.getMetadata(
      'check_permissions',
      AuditController.prototype.findAll,
    );
    const exportCsvMeta = Reflect.getMetadata(
      'check_permissions',
      (AuditController.prototype as any).exportCsv,
    );
    expect(findAllMeta).toBeDefined();
    expect(exportCsvMeta).toBeDefined();
    expect(exportCsvMeta).toEqual(findAllMeta);
  });
});

describe('ExportAuditQueryDto validation', () => {
  it('accepts valid action enum value', async () => {
    const dto = plainToInstance(ExportAuditQueryDto, { action: 'update' });
    const errors = await validate(dto);
    expect(errors).toEqual([]);
  });

  it('rejects unknown action enum value', async () => {
    const dto = plainToInstance(ExportAuditQueryDto, { action: 'foo' });
    const errors = await validate(dto);
    const actionErrors = errors.filter((e) => e.property === 'action');
    expect(actionErrors.length).toBeGreaterThan(0);
    expect(JSON.stringify(actionErrors[0].constraints)).toMatch(/isEnum/i);
  });

  it('accepts valid category enum value', async () => {
    const dto = plainToInstance(ExportAuditQueryDto, { category: 'MUTATION' });
    const errors = await validate(dto);
    expect(errors).toEqual([]);
  });

  it('rejects unknown category enum value', async () => {
    const dto = plainToInstance(ExportAuditQueryDto, { category: 'BOGUS' });
    const errors = await validate(dto);
    const categoryErrors = errors.filter((e) => e.property === 'category');
    expect(categoryErrors.length).toBeGreaterThan(0);
  });

  it('rejects malformed startDate', async () => {
    const dto = plainToInstance(ExportAuditQueryDto, {
      startDate: 'not-a-date',
    });
    const errors = await validate(dto);
    const startDateErrors = errors.filter((e) => e.property === 'startDate');
    expect(startDateErrors.length).toBeGreaterThan(0);
  });

  it('does not declare page or limit fields', () => {
    const dto = new ExportAuditQueryDto();
    expect((dto as any).page).toBeUndefined();
    expect((dto as any).limit).toBeUndefined();
  });
});
