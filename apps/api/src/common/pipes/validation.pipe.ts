import { ValidationPipe, HttpStatus } from '@nestjs/common';

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
}
