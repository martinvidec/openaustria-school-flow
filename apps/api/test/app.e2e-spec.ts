import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { HealthModule } from '../src/modules/health/health.module';
import { PrismaService } from '../src/config/database/prisma.service';
import { ConfigModule } from '@nestjs/config';

/**
 * HealthController depends on PrismaService + ConfigService (DEPLOY-03
 * readiness endpoint). For this bootstrap-only e2e test we register a stub
 * PrismaService via a dedicated @Global() module so the Nest DI container
 * can resolve HealthController without a live PostgreSQL connection.
 */
const prismaStub = {
  $queryRaw: async () => [{ '?column?': 1 }],
  onModuleInit: async () => {},
  onModuleDestroy: async () => {},
};

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: prismaStub }],
  exports: [PrismaService],
})
class PrismaStubModule {}

describe('App (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaStubModule,
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) should return ok', async () => {
    const result = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('schoolflow-api');
  });
});
