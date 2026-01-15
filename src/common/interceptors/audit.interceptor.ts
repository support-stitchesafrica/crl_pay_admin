import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction, AuditResource } from '../../entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, body, query, headers, user, ip } = request;
    const userAgent = headers['user-agent'];

    // Extract user information from request
    const userId = user?.userId || user?.adminId || user?.merchantId || user?.financierId;
    const userEmail = user?.email;
    const userType = this.getUserType(request);

    // Determine action and resource from the endpoint
    const { action, resource, resourceId } = this.extractActionAndResource(method, url, body);

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Create audit log for successful requests
        this.auditService.createAuditLog({
          userId,
          userEmail,
          userType,
          ipAddress: ip,
          userAgent,
          method,
          endpoint: url,
          path: url.split('?')[0],
          query: Object.keys(query).length > 0 ? query : undefined,
          body: this.sanitizeBody(body),
          statusCode,
          responseTime,
          success: true,
          action,
          resource,
          resourceId,
          metadata: {
            responseData: this.sanitizeResponse(data),
          },
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Create audit log for failed requests
        this.auditService.createAuditLog({
          userId,
          userEmail,
          userType,
          ipAddress: ip,
          userAgent,
          method,
          endpoint: url,
          path: url.split('?')[0],
          query: Object.keys(query).length > 0 ? query : undefined,
          body: this.sanitizeBody(body),
          statusCode,
          responseTime,
          success: false,
          errorMessage: error.message,
          action,
          resource,
          resourceId,
          metadata: {
            errorStack: error.stack,
          },
        });

        throw error;
      }),
    );
  }

  private getUserType(request: any): 'admin' | 'merchant' | 'financier' | 'customer' | 'system' {
    const user = request.user;
    if (!user) return 'system';

    if (user.adminId || user.role === 'admin') return 'admin';
    if (user.merchantId || user.role === 'merchant') return 'merchant';
    if (user.financierId || user.role === 'financier') return 'financier';
    if (user.customerId || user.role === 'customer') return 'customer';

    return 'system';
  }

  private extractActionAndResource(
    method: string,
    url: string,
    body: any,
  ): { action: string; resource: string; resourceId?: string } {
    // Default values
    let action = `${method}_REQUEST`;
    let resource = 'system';
    let resourceId: string | undefined;

    // Parse URL to extract resource and action
    const pathParts = url.split('/').filter((part) => part && !part.startsWith('api'));

    if (pathParts.length > 0) {
      // Extract resource from path (e.g., /loans, /merchants, /customers)
      const resourcePart = pathParts[0];
      
      // Map common resources
      if (resourcePart.includes('loan')) resource = 'loan';
      else if (resourcePart.includes('merchant')) resource = 'merchant';
      else if (resourcePart.includes('customer')) resource = 'customer';
      else if (resourcePart.includes('financier')) resource = 'financier';
      else if (resourcePart.includes('repayment')) resource = 'repayment';
      else if (resourcePart.includes('admin')) resource = 'admin';
      else if (resourcePart.includes('integration')) resource = 'integration';
      else if (resourcePart.includes('setting')) resource = 'settings';

      // Extract resource ID if present (UUID pattern)
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const uuidMatch = url.match(uuidPattern);
      if (uuidMatch) {
        resourceId = uuidMatch[0];
      }

      // Determine action based on method and path
      if (method === 'POST') {
        if (url.includes('/login')) action = 'ADMIN_LOGIN';
        else if (url.includes('/logout')) action = 'ADMIN_LOGOUT';
        else if (url.includes('/approve')) action = `APPROVE_${resource.toUpperCase()}`;
        else if (url.includes('/reject')) action = `REJECT_${resource.toUpperCase()}`;
        else if (url.includes('/suspend')) action = `SUSPEND_${resource.toUpperCase()}`;
        else if (url.includes('/disburse')) action = 'DISBURSE_LOAN';
        else if (url.includes('/liquidation')) action = 'LIQUIDATE_LOAN';
        else if (url.includes('/manual')) action = 'MANUAL_REPAYMENT';
        else if (url.includes('/accrual')) action = 'TRIGGER_ACCRUAL';
        else if (url.includes('/auto-debit')) action = 'TRIGGER_AUTO_DEBIT';
        else action = `CREATE_${resource.toUpperCase()}`;
      } else if (method === 'PUT' || method === 'PATCH') {
        action = `UPDATE_${resource.toUpperCase()}`;
      } else if (method === 'DELETE') {
        action = `DELETE_${resource.toUpperCase()}`;
      } else if (method === 'GET') {
        action = `VIEW_${resource.toUpperCase()}`;
      }
    }

    // Extract resourceId from body if not found in URL
    if (!resourceId && body) {
      resourceId = body.loanId || body.merchantId || body.customerId || body.financierId;
    }

    return { action, resource, resourceId };
  }

  private sanitizeBody(body: any): Record<string, any> | undefined {
    if (!body || typeof body !== 'object') return undefined;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorizationCode'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    if (!data || typeof data !== 'object') return undefined;

    try {
      // Convert to plain JSON to avoid Firestore serialization issues with class instances
      const plainData = JSON.parse(JSON.stringify(data));
      
      // Limit response data size to avoid storing large payloads
      const stringified = JSON.stringify(plainData);
      if (stringified.length > 5000) {
        return { message: 'Response too large to store', size: stringified.length };
      }

      return plainData;
    } catch (error) {
      return { message: 'Unable to serialize response data' };
    }
  }
}
