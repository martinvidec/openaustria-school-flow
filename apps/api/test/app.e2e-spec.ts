import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { HealthModule } from '../src/modules/health/health.module';
import { ConfigModule } from '@nestjs/config';

describe('App (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
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
