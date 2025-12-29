export type PaymentStatus =
  | 'pending'      // Scheduled, not yet processed
  | 'processing'   // Currently being processed
  | 'success'      // Successfully paid
  | 'failed'       // Payment failed
  | 'refunded';    // Payment was refunded

export type PaymentMethod =
  | 'auto-debit'   // Automatic card charge
  | 'manual';      // Manual payment link

export interface Payment {
  paymentId: string;
  loanId: string;
  merchantId: string;
  customerId: string;

  // Payment Details
  installmentNumber: number;
  amount: number;
  principalAmount: number;
  interestAmount: number;

  // Payment Method
  method: PaymentMethod;

  // Status
  status: PaymentStatus;

  // Paystack Details
  paystackReference?: string;
  authorizationCode?: string;

  // Retry Logic
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  lastAttemptAt?: Date;

  // Timestamps
  scheduledFor: Date;
  processedAt?: Date;
  succeededAt?: Date;
  failedAt?: Date;

  // Error Tracking
  errorMessage?: string;
  errorCode?: string;

  // Metadata
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentStats {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalAmount: number;
  successfulAmount: number;
  failedAmount: number;
}

// Paystack webhook payload
export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
    };
    plan: any;
    subaccount: any;
    split: any;
    order_id: any;
    paidAt: string;
    requested_amount: number;
  };
}
