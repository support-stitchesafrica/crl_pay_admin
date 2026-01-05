export type ReservationStatus = 'active' | 'consumed' | 'released' | 'expired';

export interface Reservation {
  reservationId: string;
  idempotencyKey: string;

  merchantId: string;
  reference: string;

  mappingId: string;
  planId?: string;
  financierId?: string;

  amount: number;
  currency: string;

  status: ReservationStatus;
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}
