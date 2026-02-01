export type ReservationStatus = 'active' | 'consumed' | 'released' | 'expired';

export interface Reservation {
  reservationId: string;
  idempotencyKey: string;

  merchantId: string;
  customerId: string;
  reference: string;

  allocationId: string;

  amount: number;
  currency: string;
  creditTier: 'bronze' | 'silver' | 'gold' | 'platinum';

  status: ReservationStatus;
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}
