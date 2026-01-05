export type WebhookEvent =
  | 'loan.created'
  | 'loan.activated'
  | 'loan.completed'
  | 'loan.defaulted'
  | 'loan.cancelled'
  | 'payment.pending'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.overdue'
  | 'customer.created'
  | 'credit.approved'
  | 'credit.declined'
  | 'CRLPAY_DISBURSEMENT_SUCCESS'
  | 'CRLPAY_DISBURSEMENT_FAILED';

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

export interface Webhook {
  webhookId: string;
  merchantId: string;

  // Webhook Configuration
  url: string;
  secret: string; // Hashed secret for signature verification
  events: WebhookEvent[];
  isActive: boolean;

  // Health Metrics
  consecutiveFailures: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  lastFailureReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  deliveryId: string;
  webhookId: string;
  merchantId: string;

  // Event Details
  event: WebhookEvent;
  payload: Record<string, any>;

  // Delivery Status
  status: WebhookDeliveryStatus;
  httpStatusCode?: number;
  responseBody?: string;
  errorMessage?: string;

  // Retry Information
  attemptCount: number;
  nextRetryAt?: Date;
  maxRetries: number;

  // Timestamps
  createdAt: Date;
  deliveredAt?: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
  webhookId: string;
  deliveryId: string;
}

// Retry delays in milliseconds
export const WEBHOOK_RETRY_DELAYS = [
  0,                    // Attempt 1: Immediate
  5 * 60 * 1000,        // Attempt 2: 5 minutes
  30 * 60 * 1000,       // Attempt 3: 30 minutes
  2 * 60 * 60 * 1000,   // Attempt 4: 2 hours
  24 * 60 * 60 * 1000,  // Attempt 5: 24 hours
];

export const MAX_WEBHOOK_RETRIES = 5;
export const MAX_CONSECUTIVE_FAILURES = 10; // Disable webhook after 10 consecutive failures

// All available webhook events
export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  'loan.created',
  'loan.activated',
  'loan.completed',
  'loan.defaulted',
  'loan.cancelled',
  'payment.pending',
  'payment.success',
  'payment.failed',
  'payment.overdue',
  'customer.created',
  'credit.approved',
  'credit.declined',
  'CRLPAY_DISBURSEMENT_SUCCESS',
  'CRLPAY_DISBURSEMENT_FAILED',
];
