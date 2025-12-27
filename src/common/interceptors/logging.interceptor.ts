import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('user-agent') || '';

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `${method} ${url} ${responseTime}ms - ${userAgent}`,
        );
      }),
    );
  }
}
