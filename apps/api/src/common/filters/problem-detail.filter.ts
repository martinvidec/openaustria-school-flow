import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  errors?: Array<{ field: string; message: string }>;
  // RFC 9457 allows arbitrary extension members on the problem-details object.
  // Phase 11 Plan 11-03 Rule-1 fix: propagate `extensions.affectedEntities`
  // from Teacher/SubjectService orphan-guard ConflictExceptions so the UI can
  // render the blocked-state DeleteTeacherDialog / DeleteSubjectDialog. Prior
  // to this fix, the filter silently discarded the extensions payload,
  // leaving the dialogs stuck in happy state on 409 responses.
  extensions?: Record<string, unknown>;
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
    let extensions: Record<string, unknown> | undefined;
    let customType: string | undefined;
    let customTitle: string | undefined;

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

        // RFC 9457 extensions passthrough — TeacherService / SubjectService
        // Orphan-Guard throws ConflictException with `extensions.affectedEntities`
        // that the admin UI's DeleteDialog blocked-state relies on.
        if (resp.extensions && typeof resp.extensions === 'object') {
          extensions = resp.extensions as Record<string, unknown>;
        }
        // Allow services to override the default type / title when they
        // provide one (e.g. domain-specific problem URIs).
        if (typeof resp.type === 'string') customType = resp.type;
        if (typeof resp.title === 'string') customTitle = resp.title;
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
      title = customTitle ?? statusTitles[status] ?? title;
    }

    const problemDetail: ProblemDetail = {
      type: customType ?? `https://httpstatuses.com/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      traceId: request.id || undefined,
    };

    if (errors) {
      problemDetail.errors = errors;
    }
    if (extensions) {
      problemDetail.extensions = extensions;
    }

    response
      .status(status)
      .header('content-type', 'application/problem+json')
      .send(problemDetail);
  }
}
