export interface AuditLog {
  auditId: string;
  timestamp: Date;
  
  // User/Actor Information
  userId?: string;
  userEmail?: string;
  userType: 'admin' | 'merchant' | 'financier' | 'customer' | 'system';
  ipAddress?: string;
  userAgent?: string;
  
  // Request Information
  method: string;
  endpoint: string;
  path: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  
  // Response Information
  statusCode: number;
  responseTime: number; // in milliseconds
  success: boolean;
  errorMessage?: string;
  
  // Action Details
  action: string; // e.g., 'CREATE_LOAN', 'UPDATE_MERCHANT', 'DELETE_CUSTOMER'
  resource: string; // e.g., 'loan', 'merchant', 'customer'
  resourceId?: string;
  
  // Changes (for update operations)
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  
  // Additional Context
  metadata?: Record<string, any>;
  
  createdAt: Date;
}

export type AuditAction =
  // Loan Actions
  | 'CREATE_LOAN'
  | 'UPDATE_LOAN'
  | 'APPROVE_LOAN'
  | 'REJECT_LOAN'
  | 'DISBURSE_LOAN'
  | 'LIQUIDATE_LOAN'
  | 'DEFAULT_LOAN'
  
  // Merchant Actions
  | 'CREATE_MERCHANT'
  | 'UPDATE_MERCHANT'
  | 'APPROVE_MERCHANT'
  | 'REJECT_MERCHANT'
  | 'SUSPEND_MERCHANT'
  
  // Customer Actions
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'BLACKLIST_CUSTOMER'
  | 'UNBLACKLIST_CUSTOMER'
  
  // Financier Actions
  | 'CREATE_FINANCIER'
  | 'UPDATE_FINANCIER'
  | 'APPROVE_FINANCIER'
  | 'REJECT_FINANCIER'
  
  // Repayment Actions
  | 'PROCESS_REPAYMENT'
  | 'MANUAL_REPAYMENT'
  | 'RETRY_REPAYMENT'
  
  // Admin Actions
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'UPDATE_SETTINGS'
  | 'TRIGGER_ACCRUAL'
  | 'TRIGGER_AUTO_DEBIT'
  
  // Integration Actions
  | 'CREATE_INTEGRATION'
  | 'UPDATE_INTEGRATION'
  | 'DELETE_INTEGRATION'
  
  // System Actions
  | 'SYSTEM_ERROR'
  | 'SYSTEM_WARNING';

export type AuditResource =
  | 'loan'
  | 'merchant'
  | 'customer'
  | 'financier'
  | 'repayment'
  | 'admin'
  | 'integration'
  | 'settings'
  | 'system';
