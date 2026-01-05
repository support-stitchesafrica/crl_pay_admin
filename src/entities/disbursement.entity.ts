export type DisbursementStatus = 'initiated' | 'success' | 'failed';

export type DisbursementProvider = 'paystack' | 'flutterwave' | 'stripe';

export interface Disbursement {
  disbursementId: string;
  idempotencyKey: string;

  merchantId: string;
  reference: string;

  reservationId: string;
  mappingId: string;
  planId?: string;
  financierId?: string;

  amount: number;
  currency: string;

  provider: DisbursementProvider;
  integrationId: string;
  mode: 'test' | 'live';

  providerRecipientCode?: string;
  providerReference?: string;

  status: DisbursementStatus;
  failureReason?: string;

  feePaidByCrlpay?: number;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}
