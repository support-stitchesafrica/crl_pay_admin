export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bvn: string;
  dateOfBirth: Date;
  address: string;
  city: string;
  state: string;

  // Credit Profile
  creditScore?: number;
  creditTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  onTimePaymentRate: number;

  // Status
  status: 'active' | 'suspended' | 'blacklisted';
  blacklistReason?: string;

  // Payment Information
  paystackAuthorizationCode?: string;
  paystackCustomerCode?: string;
  cardType?: string;
  cardLast4?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  cardBank?: string;
  cardAuthorizedAt?: Date;

  // Metadata
  merchantId: string; // Primary merchant this customer belongs to
  deviceFingerprint?: string;
  ipAddress?: string;
  registeredVia: string; // merchantId (legacy - same as merchantId)
  createdAt: Date;
  updatedAt: Date;
  lastLoanAt?: Date;
}
