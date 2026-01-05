export type TransactionStatus = 'pending' | 'success' | 'failed';

export type TransactionType =
  | 'ALLOCATION_RESERVED'
  | 'ALLOCATION_RELEASED'
  | 'DISBURSEMENT_INITIATED'
  | 'DISBURSEMENT_SUCCESS'
  | 'DISBURSEMENT_FAILED'
  | 'LOAN_CREATED'
  | 'REPAYMENT_SUCCESS'
  | 'TRANSFER_FEE';

export type TransactionProvider = 'paystack' | 'flutterwave' | 'stripe' | 'internal' | 'manual';

export interface Transaction {
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;

  idempotencyKey: string;

  merchantId: string;
  reference: string;

  mappingId?: string;
  planId?: string;
  financierId?: string;
  loanId?: string;
  reservationId?: string;
  disbursementId?: string;

  amount: number;
  currency: string;

  provider: TransactionProvider;
  integrationId?: string;
  providerReference?: string;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}
