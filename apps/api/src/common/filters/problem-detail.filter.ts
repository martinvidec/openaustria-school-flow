import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  errors?: Array<{ field: string; message: string }>;
}

@Catch()
export class ProblemDetailFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => any; header: (key: string, value: string) => any; send: (body: unknown) => void }>();
    const request = ctx.getRequest<{ url: string; id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es spaeter erneut.';
    let title = 'Internal Server Error';
    let errors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        // Handle class-validator errors
        if (Array.isArray(resp.message)) {
          detail = 'Eingabefehler: Bitte pruefen Sie Ihre Eingaben.';
          title = 'Validation Error';
          errors = (resp.message as string[]).map((msg: string) => ({
            field: msg.split(' ')[0] || 'unknown',
            message: msg,
          }));
        } else {
          detail = (resp.message as string) || (resp.detail as string) || detail;
        }
      } else if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      }

      // Map status to titles
      const statusTitles: Record<number, string> = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
      };
      title = statusTitles[status] || title;
    }

    const problemDetail: ProblemDetail = {
      type: `https://httpstatuses.com/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      traceId: request.id || undefined,
    };

    if (errors) {
      problemDetail.errors = errors;
    }

    response
      .status(status)
      .header('content-type', 'application/problem+json')
      .send(problemDetail);
  }
}
