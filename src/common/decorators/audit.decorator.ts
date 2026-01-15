import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditResource } from '../../entities/audit-log.entity';

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  action: AuditAction | string;
  resource: AuditResource | string;
  description?: string;
}

/**
 * Decorator to mark endpoints for audit logging
 * @param action - The action being performed
 * @param resource - The resource being acted upon
 * @param description - Optional description of the action
 * 
 * @example
 * @Audit('CREATE_LOAN', 'loan', 'Creating a new loan')
 * async createLoan(@Body() dto: CreateLoanDto) {
 *   // ...
 * }
 */
export const Audit = (
  action: AuditAction | string,
  resource: AuditResource | string,
  description?: string,
) => SetMetadata(AUDIT_METADATA_KEY, { action, resource, description } as AuditMetadata);
