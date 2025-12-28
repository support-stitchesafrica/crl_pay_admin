# CRL Pay Database Schema Documentation

This document describes the Firebase Firestore database schema for the CRL Pay BNPL system. All collections are prefixed with `crl_` to distinguish them from other data in your Firebase database.

## Collections Overview

1. **crl_merchants** - Merchant/Partner information
2. **crl_customers** - Customer profiles and data
3. **crl_credit_assessments** - Credit decision records
4. **crl_loans** - Active and completed loans
5. **crl_payments** - Individual payment/installment records
6. **crl_transactions** - Transaction log for audit trail
7. **crl_notifications** - Notification delivery log
8. **crl_merchant_settlements** - Merchant payment settlements
9. **crl_defaults** - Default management and collection tracking
10. **crl_merchant_analytics** - Aggregated analytics data

---

## 1. Collection: `crl_merchants`

Stores information about merchants integrated with CRL Pay.

### Document Structure

```typescript
{
  merchantId: string;              // Unique merchant identifier (document ID)
  businessName: string;            // Registered business name
  email: string;                   // Business email
  phone: string;                   // Business phone
  passwordHash: string;            // Hashed password for authentication
  status: 'pending' | 'approved' | 'rejected' | 'suspended';

  apiKey?: string;                 // Public API key (generated on approval)
  apiSecret?: string;              // Secret API key (generated on approval, hashed)

  webhookUrl?: string;             // URL for webhook notifications

  // Merchant-specific loan configuration
  loanConfig?: {
    interestRate: number;          // Interest rate per payment period (e.g., 2.5%)
    maxLoanAmounts: {
      bronze: number;              // Max for 30-day loans (e.g., 50000)
      silver: number;              // Max for 60-day loans (e.g., 100000)
      gold: number;                // Max for 90-day loans (e.g., 200000)
    };
    defaultPaymentFrequency: 'weekly' | 'bi-weekly' | 'monthly';
    minCreditScore: number;        // Min credit score to approve (e.g., 500)
    autoApproveLimit: number;      // Max amount for instant approval (e.g., 10000)
    updatedAt: Timestamp;
  };

  settlementAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  businessDocuments?: {
    cacDocument?: string;          // URL to CAC document
    cacNumber?: string;            // CAC registration number
    taxId?: string;
    proofOfAddress?: string;
  };

  // Business details
  businessAddress: string;
  businessCategory: string;
  websiteUrl?: string;

  // Admin review data
  adminNotes?: string;             // Admin notes from approval/rejection
  approvedBy?: string;             // Admin ID who approved
  approvedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

### Indexes
- `email` (for login/lookup)
- `apiKey` (for API authentication)
- `status` (for filtering pending/approved merchants)
- `createdAt` (for sorting)

### Important Notes
- **Loan Configuration**: Each merchant configures their own interest rates and loan limits
- **API Keys**: Generated automatically on merchant approval by admin
- **Status Flow**: pending → approved/rejected (admin decision)
- **Password**: Hashed using bcrypt (10 rounds)

---

## 2. Collection: `crl_customers`

Customer profiles tied to merchants, supporting cross-merchant credit history.

### Document Structure

```typescript
{
  customerId: string;              // Unique customer ID (document ID)
  merchantId: string;              // Original merchant ID

  // Identity Information
  bvn: string;                     // Bank Verification Number (encrypted)
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;             // YYYY-MM-DD format

  // Address Information
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  // Device Intelligence
  deviceInfo: {
    phoneType: string;
    deviceFingerprint: string;
    operatingSystem: string;
  };

  // Location Data
  locationData: {
    gps: {
      latitude: number;
      longitude: number;
    };
    ipAddress: string;
  };

  // Credit Information
  creditScore: number;             // 0-1000
  creditLimit: number;             // Maximum loan amount
  totalLoans: number;              // Total loans taken
  activeLoans: number;             // Currently active loans
  defaultedLoans: number;          // Number of defaulted loans

  // Payment History
  paymentHistory: {
    onTimePayments: number;
    latePayments: number;
    missedPayments: number;
    averagePaymentDelay: number;   // in days
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Indexes
- `bvn` (for duplicate detection)
- `email` (for lookup)
- `phone` (for lookup)
- `merchantId` (for merchant-specific queries)
- `creditScore` (for eligibility checks)

---

## 3. Collection: `crl_credit_assessments`

Records of credit assessment decisions for audit and improvement.

### Document Structure

```typescript
{
  assessmentId: string;            // Unique assessment ID (document ID)
  customerId: string;
  merchantId: string;

  // Identity Verification Layer
  identityVerification: {
    bvnVerified: boolean;
    biometricMatched: boolean;
    duplicateCheck: boolean;
  };

  // Behavioral Intelligence
  behavioralIntelligence: {
    deviceFingerprint: string;
    locationConsistency: boolean;
    transactionVelocity: number;   // transactions per hour
    timeOfDayPattern: string;
  };

  // Merchant Relationship
  merchantRelationship: {
    accountAge: number;            // in days
    purchaseHistory: number;       // number of purchases
    averageOrderValue: number;
    returnRate: number;            // percentage
  };

  // Financial Capacity
  financialCapacity: {
    cardValid: boolean;
    estimatedCreditworthiness: number;
    debtToIncomeRatio?: number;
  };

  // Decision Output
  creditScore: number;             // Composite score 0-1000
  decision: 'instant_approval' | 'conditional_approval' | 'manual_review' | 'declined';
  creditLimit: number;
  decisionReason: string;

  assessedAt: Timestamp;
}
```

### Indexes
- `customerId` (for customer history)
- `merchantId` (for merchant analytics)
- `decision` (for decision analysis)
- `assessedAt` (for time-series analysis)

---

## 4. Collection: `crl_loans`

Active and historical loan records.

### Document Structure

```typescript
{
  loanId: string;                  // Unique loan ID (document ID)
  customerId: string;
  merchantId: string;
  transactionReference: string;    // Merchant's transaction reference

  // Loan Details
  principalAmount: number;         // Original amount borrowed
  interestRate: number;            // Monthly interest rate (%)
  totalAmount: number;             // Principal + interest
  installmentAmount: number;       // Per-installment amount
  numberOfInstallments: number;    // Total installments
  paidInstallments: number;        // Installments paid so far
  remainingBalance: number;        // Current outstanding balance

  // Payment Plan
  paymentPlan: 'bronze' | 'silver' | 'gold' | 'platinum';

  // Status
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';

  // Payment Method
  cardToken: string;               // Tokenized card for auto-debit

  // Dates
  nextPaymentDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;

  // Metadata
  metadata: {
    productDetails?: string;
    orderValue?: number;
    initialPayment?: number;
  };
}
```

### Indexes
- `customerId` (for customer loan history)
- `merchantId` (for merchant analytics)
- `status` (for active loan queries)
- `nextPaymentDate` (for payment processing)
- `createdAt` (for sorting)

---

## 5. Collection: `crl_payments`

Individual installment payment records.

### Document Structure

```typescript
{
  paymentId: string;               // Unique payment ID (document ID)
  loanId: string;
  customerId: string;

  // Payment Details
  amount: number;
  installmentNumber: number;       // 1, 2, 3, etc.
  status: 'pending' | 'successful' | 'failed' | 'refunded';

  // Payment Method
  paymentMethod: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money';
  paystackReference?: string;      // Paystack transaction reference

  // Retry Information
  retryCount: number;
  lastRetryDate?: Timestamp;
  failureReason?: string;

  // Dates
  scheduledDate: Timestamp;        // When payment was due
  paidDate?: Timestamp;            // When payment was actually made

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Indexes
- `loanId` (for loan payment history)
- `customerId` (for customer payment history)
- `status` (for payment monitoring)
- `scheduledDate` (for payment processing)

---

## 6. Collection: `crl_transactions`

Comprehensive transaction log for all financial activities.

### Document Structure

```typescript
{
  transactionId: string;           // Unique transaction ID (document ID)
  customerId: string;
  merchantId: string;
  loanId?: string;

  // Transaction Details
  type: 'loan_disbursement' | 'installment_payment' | 'late_fee' | 'early_payment' | 'refund';
  amount: number;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  reference: string;               // External reference (Paystack, etc.)

  // Audit Information
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };

  createdAt: Timestamp;
}
```

### Indexes
- `customerId` (for customer transaction history)
- `merchantId` (for merchant reporting)
- `loanId` (for loan-specific transactions)
- `type` (for transaction type analysis)
- `createdAt` (for chronological sorting)

---

## 7. Collection: `crl_notifications`

Log of all customer notifications sent.

### Document Structure

```typescript
{
  notificationId: string;          // Unique notification ID (document ID)
  customerId: string;

  // Notification Details
  type: 'sms' | 'email' | 'push';
  channel: string;                 // Provider used (Twilio, SendGrid, etc.)
  subject?: string;                // For emails
  message: string;

  // Status
  status: 'sent' | 'failed' | 'pending';
  failureReason?: string;

  // Dates
  sentAt?: Timestamp;
  createdAt: Timestamp;
}
```

### Indexes
- `customerId` (for customer notification history)
- `type` (for channel analysis)
- `createdAt` (for sorting)

---

## 8. Collection: `crl_merchant_settlements`

Merchant payment settlements for completed transactions.

### Document Structure

```typescript
{
  settlementId: string;            // Unique settlement ID (document ID)
  merchantId: string;
  loanId: string;

  // Settlement Details
  amount: number;                  // Original transaction amount
  fee: number;                     // CRL Pay fee
  netAmount: number;               // Amount settled to merchant

  // Status
  status: 'pending' | 'completed' | 'failed';
  paymentReference?: string;       // Bank transfer reference

  // Dates
  settledAt?: Timestamp;
  createdAt: Timestamp;
}
```

### Indexes
- `merchantId` (for merchant settlement history)
- `status` (for pending settlements)
- `createdAt` (for sorting)

---

## 9. Collection: `crl_defaults`

Default management and collection tracking.

### Document Structure

```typescript
{
  defaultId: string;               // Unique default ID (document ID)
  loanId: string;
  customerId: string;

  // Default Details
  daysOverdue: number;
  amountOverdue: number;
  escalationLevel: 'low' | 'medium' | 'high' | 'critical' | 'terminal';

  // Collection Efforts
  contactAttempts: number;
  lastContactDate?: Timestamp;
  lastContactMethod?: string;

  // Resolution
  resolutionStatus: 'pending' | 'payment_plan' | 'legal' | 'written_off';
  resolutionDetails?: string;

  // Dates
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
}
```

### Indexes
- `loanId` (for loan default tracking)
- `customerId` (for customer default history)
- `escalationLevel` (for prioritization)
- `resolutionStatus` (for collection management)

---

## 10. Collection: `crl_merchant_analytics`

Pre-aggregated analytics data for merchant dashboards.

### Document Structure

```typescript
{
  analyticsId: string;             // Unique analytics ID (document ID)
  merchantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  periodDate: Timestamp;           // Start of period

  // Metrics
  metrics: {
    totalTransactions: number;
    totalAmount: number;
    approvedTransactions: number;
    approvalRate: number;
    averageOrderValue: number;
    defaultRate: number;
    collectionRate: number;
    revenue: number;
    fees: number;
  };

  createdAt: Timestamp;
}
```

### Indexes
- `merchantId` (for merchant-specific analytics)
- `period` (for aggregation level)
- `periodDate` (for time-series queries)

---

## Security Rules Recommendations

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Merchants can only read their own data
    match /crl_merchants/{merchantId} {
      allow read: if request.auth != null && request.auth.uid == merchantId;
      allow write: if false; // Only via backend
    }

    // Customers can read their own data
    match /crl_customers/{customerId} {
      allow read: if request.auth != null && request.auth.uid == customerId;
      allow write: if false; // Only via backend
    }

    // All other collections: backend only
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Data Retention Policy

- **Active Loans**: Retained indefinitely
- **Completed Loans**: Retained for 7 years (regulatory compliance)
- **Credit Assessments**: Retained for 3 years
- **Transactions**: Retained for 7 years
- **Notifications**: Retained for 1 year
- **Analytics**: Retained indefinitely (aggregated data)

---

## Backup Strategy

1. **Daily Automated Backups**: Firebase automatic backups enabled
2. **Point-in-Time Recovery**: 7-day recovery window
3. **Export Schedule**: Weekly exports to Cloud Storage for long-term archival
