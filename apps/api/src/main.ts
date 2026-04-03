import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ProblemDetailFilter } from './common/filters/problem-detail.filter';
import { createValidationPipe } from './common/pipes/validation.pipe';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
  const realm = configService.get<string>('KEYCLOAK_REALM', 'schoolflow');

  // Global prefix (D-13)
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // @fastify/multipart for file upload support (D-13, BOOK-06)
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per D-13
  });

  // Socket.IO adapter for Fastify compatibility
  // Required because Fastify does not share Express's built-in HTTP upgrade handling.
  // Without this, @WebSocketGateway decorators may fail to bind Socket.IO to the server.
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global validation pipe
  app.useGlobalPipes(createValidationPipe());

  // Global exception filter (D-12: RFC 9457)
  app.useGlobalFilters(new ProblemDetailFilter());

  // Swagger/OpenAPI setup (API-02, API-03)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SchoolFlow API')
    .setDescription('OpenAustria SchoolFlow REST API - Schulverwaltungsplattform')
    .setVersion('1.0')
    .addOAuth2({
      type: 'oauth2',
      description: 'Keycloak OIDC Authentication',
      flows: {
        authorizationCode: {
          authorizationUrl: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth`,
          tokenUrl: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
          scopes: {
            openid: 'OpenID',
            profile: 'Profile',
            email: 'Email',
          },
        },
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      oauth2RedirectUrl: 'http://localhost:3000/api/docs/oauth2-redirect.html',
      initOAuth: {
        clientId: configService.get<string>('KEYCLOAK_CLIENT_ID', 'schoolflow-api'),
        scopes: ['openid', 'profile', 'email'],
      },
      persistAuthorization: true, // AUTH-06: Swagger UI persists token across page refresh
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`SchoolFlow API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
