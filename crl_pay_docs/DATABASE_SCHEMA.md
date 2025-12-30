# CRL Pay Database Schema Documentation

This document describes the Firebase Firestore database schema for the CRL Pay BNPL system. All collections are prefixed with `crl_` to distinguish them from other data in your Firebase database.

## Collections Overview

1. **crl_merchants** - Merchant/Partner information
2. **crl_financiers** - Financier/Funding institution information
3. **crl_financing_plans** - Financier-created loan plans
4. **crl_plan_merchant_mappings** - Mapping of plans to merchants
5. **crl_customers** - Customer profiles and data
6. **crl_credit_assessments** - Credit decision records
7. **crl_loans** - Active and completed loans
8. **crl_payments** - Individual payment/installment records
9. **crl_transactions** - Transaction log for audit trail
10. **crl_notifications** - Notification delivery log
11. **crl_merchant_settlements** - Merchant payment settlements
12. **crl_defaults** - Default management and collection tracking
13. **crl_merchant_analytics** - Aggregated analytics data
14. **crl_merchant_loan_configs** - Merchant-specific loan configurations
15. **crl_webhooks** - Webhook subscriptions and delivery logs

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

## 2. Collection: `crl_financiers`

Stores information about financiers (funding institutions) that provide capital for BNPL financing.

### Document Structure

```typescript
{
  financierId: string;             // Unique financier identifier (document ID)
  companyName: string;             // Registered company name
  email: string;                   // Business email
  phone: string;                   // Business phone
  passwordHash: string;            // Hashed password for authentication
  status: 'pending' | 'approved' | 'rejected' | 'suspended';

  // Business Details
  businessAddress: string;
  businessCategory: string;        // e.g., 'Bank', 'Microfinance', 'Investment Firm'
  registrationNumber: string;      // Company registration number
  taxId: string;

  // Financial Information
  availableFunds: number;          // Total funds available for financing
  allocatedFunds: number;          // Funds currently allocated to active loans
  totalDisbursed: number;          // Lifetime disbursed amount
  totalRepaid: number;             // Lifetime repaid amount

  // Settlement Account
  settlementAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  // Business Documents
  businessDocuments: {
    cacDocument?: string;          // URL to CAC document
    operatingLicense?: string;     // URL to operating license
    proofOfFunds?: string;         // URL to proof of funds document
  };

  // Admin Review Data
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
- `status` (for filtering pending/approved financiers)
- `createdAt` (for sorting)

### Important Notes
- **Funds Management**: System tracks available vs allocated funds
- **Status Flow**: pending → approved/rejected (admin decision)
- **Multi-tenancy**: Each financier operates independently with their own plans

---

## 3. Collection: `crl_financing_plans`

Stores financing plans created by financiers with specific terms and eligibility rules.

### Document Structure

```typescript
{
  planId: string;                  // Unique plan identifier (document ID)
  financierId: string;             // Reference to financier who created this plan

  // Plan Details
  name: string;                    // Plan name (e.g., "6-Month Standard", "Quick Cash")
  description?: string;            // Plan description

  // Loan Terms
  tenor: {
    value: number;                 // Duration value (e.g., 6, 12, 90)
    period: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  };
  interestRate: number;            // Interest rate percentage (e.g., 5 for 5%)
  minimumAmount: number;           // Minimum loan amount (e.g., 10000)
  maximumAmount: number;           // Maximum loan amount (e.g., 500000)

  // Payment Terms
  gracePeriod: {
    value: number;                 // Grace period value
    period: 'DAYS' | 'WEEKS' | 'MONTHS';
  };
  lateFee: {
    type: 'fixed' | 'percentage';
    amount: number;                // Amount or percentage
  };
  allowEarlyRepayment: boolean;    // Whether early repayment is allowed

  // Eligibility Criteria (optional - for advanced filtering)
  eligibilityCriteria?: {
    minCreditScore?: number;       // Minimum credit score required
    minMonthlyIncome?: number;     // Minimum monthly income
    maxDebtToIncome?: number;      // Maximum debt-to-income ratio
    minEmploymentMonths?: number;  // Minimum employment duration
    allowedEmailDomains?: string[]; // Whitelisted email domains (for corporate staff)
    allowedCategories?: string[];  // Allowed product categories
  };

  // Subsidy Configuration (future enhancement)
  subsidy?: {
    enabled: boolean;
    percentage: number;            // Percentage of interest subsidized
    maxSubsidyAmount: number;      // Maximum subsidy per loan
  };

  // Status & Availability
  status: 'pending' | 'approved' | 'inactive';
  isActive: boolean;               // Whether plan is currently active
  totalFundsAllocated: number;     // Total funds allocated to this plan by financier
  fundsAllocatedToMerchants: number; // Funds allocated to merchants via mappings
  totalLoansCreated: number;       // Number of loans created under this plan

  // Admin Approval
  approvedBy?: string;             // Admin ID who approved
  approvedAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  activatedAt?: Timestamp;
  deactivatedAt?: Timestamp;
}
```

### Indexes
- `financierId` (for financier-specific plans)
- `status` (for active plans)
- `createdAt` (for sorting)

### Important Notes
- **Plan Flexibility**: Each financier can create multiple plans with different terms
- **Eligibility Rules**: Plans can have specific criteria for who can access them
- **Fund Allocation**: Tracks how much capital is tied to each plan

---

## 4. Collection: `crl_plan_merchant_mappings`

Maps financing plans to merchants, controlling which merchants can offer which plans to their customers. Created by CRL Pay Admin.

### Document Structure

```typescript
{
  mappingId: string;               // Unique mapping identifier (document ID)
  planId: string;                  // Reference to financing plan
  merchantId: string;              // Reference to merchant
  financierId: string;             // Reference to financier (for quick lookup)

  // Mapping Details
  status: 'active' | 'inactive' | 'suspended';

  // Fund Allocation
  fundsAllocated: number;          // Total funds allocated to this merchant for this plan
  currentAllocation: number;       // Funds currently in use (active loans)
  expirationDate: Timestamp;       // When this mapping expires

  // Usage Tracking
  totalLoans: number;              // Total loans created under this mapping
  totalDisbursed: number;          // Lifetime disbursed to this merchant
  totalRepaid: number;             // Lifetime repaid from this merchant
  defaultRate: number;             // Default rate percentage

  // Mapping Metadata
  mappedBy: string;                // Admin who created the mapping
  mappedAt: Timestamp;             // When mapping was created
  lastTransactionAt?: Timestamp;   // Last loan transaction timestamp

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Indexes
- `planId` (for plan-specific mappings)
- `merchantId` (for merchant-specific mappings)
- `financierId` (for financier-specific mappings)
- `status` (for active mappings)
- Composite: `merchantId + status` (for merchant's active plans)
- Composite: `planId + status` (for plan's active merchants)

### Important Notes
- **Admin-Controlled**: Only CRL Pay admins can create/approve plan mappings
- **Fund Allocation**: Each mapping tracks available funds for that specific merchant-plan combination
- **Performance Tracking**: Monitors merchant's performance with each financing plan
- **Approval Workflow**: Mappings require admin approval before becoming active

---

## 5. Collection: `crl_customers`

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

Active and historical loan records with flexible tenor and frequency configuration.

### Document Structure

```typescript
{
  loanId: string;                  // Unique loan ID (document ID)
  customerId: string;
  merchantId: string;
  financierId?: string;            // Reference to financier (if funded by financier)
  planId?: string;                 // Reference to financing plan (if using financier plan)
  mappingId?: string;              // Reference to plan-merchant mapping

  // Loan Details
  principalAmount: number;         // Original amount borrowed
  fundingSource: 'merchant' | 'financier';  // Who is funding this loan

  // Loan Configuration (calculated at creation)
  configuration: {
    frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'bi-annually' | 'annually';
    tenor: {
      value: number;               // e.g., 6, 12, 90
      period: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
    };
    numberOfInstallments: number;  // Calculated based on tenor and frequency
    interestRate: number;          // Annual percentage rate (e.g., 15 for 15%)
    penaltyRate: number;           // Late payment penalty percentage
    installmentAmount: number;     // Per-installment amount
    totalInterest: number;         // Total interest over loan term
    totalAmount: number;           // Principal + Interest
  };

  // Payment Schedule (array of installments)
  paymentSchedule: {
    installmentNumber: number;
    dueDate: Timestamp;
    amount: number;
    principalAmount: number;
    interestAmount: number;
    status: 'pending' | 'paid' | 'overdue' | 'failed';
    paidAt?: Timestamp;
    paidAmount?: number;
    paymentId?: string;
    attemptCount?: number;
    lastAttemptAt?: Timestamp;
  }[];

  // Status
  status: 'pending' | 'active' | 'completed' | 'defaulted' | 'cancelled';
  currentInstallment: number;      // Which installment are we on
  amountPaid: number;              // Total amount paid so far
  amountRemaining: number;         // Current outstanding balance

  // Card Authorization (for auto-debit)
  cardAuthorization?: {
    authorizationCode: string;
    cardType: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    bank: string;
    paystackCustomerCode?: string;
  };

  // Metadata
  orderId?: string;                // Merchant's order reference
  productDescription?: string;
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Timestamp;
  activatedAt?: Timestamp;         // When card was authorized
  firstPaymentDate?: Timestamp;
  lastPaymentDate?: Timestamp;
  completedAt?: Timestamp;
  defaultedAt?: Timestamp;
  updatedAt: Timestamp;

  // Default Management
  daysOverdue?: number;
  overdueAmount?: number;
  lateFees?: number;
  escalationLevel?: 'low' | 'medium' | 'high' | 'critical' | 'terminal';

  // Notes
  notes?: string;
}
```

### Loan Status Flow
```
pending → active → completed
                 ↘ defaulted
pending → cancelled
```

- **pending**: Loan created, awaiting card authorization
- **active**: Card authorized, payments being collected
- **completed**: All installments paid
- **defaulted**: Missed payments, in collections
- **cancelled**: Cancelled before activation

### Indexes
- `customerId` (for customer loan history)
- `merchantId` (for merchant analytics)
- `financierId` (for financier analytics)
- `planId` (for plan performance tracking)
- `fundingSource` (for segregating merchant vs financier funded loans)
- `status` (for active loan queries)
- `createdAt` (for sorting)
- `paymentSchedule.dueDate` (for payment processing)
- Composite: `financierId + status` (for financier's active loans)
- Composite: `planId + status` (for plan's active loans)

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

## 11. Collection: `crl_merchant_loan_configs`

Merchant-specific loan configurations allowing multiple loan products per merchant.

### Document Structure

```typescript
{
  configId: string;                // Unique config ID (document ID)
  merchantId: string;
  name: string;                    // e.g., "Standard Plan", "Flexible Plan", "Quick Cash"
  description?: string;

  // Rate Configuration
  interestRate: number;            // Annual interest rate percentage (e.g., 15 for 15%)
  penaltyRate: number;             // Late payment penalty percentage (e.g., 5 for 5%)

  // Loan Limits
  minLoanAmount: number;           // Minimum loan amount (e.g., 5000)
  maxLoanAmount: number;           // Maximum loan amount (e.g., 500000)

  // Allowed Frequencies
  allowedFrequencies: ('daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'bi-annually' | 'annually')[];

  // Allowed Tenors
  allowedTenors: {
    minValue: number;              // e.g., 1
    maxValue: number;              // e.g., 12
    period: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  }[];

  // Status
  isActive: boolean;               // Whether this config is currently available

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Example Configurations

```typescript
// Example 1: Short-term daily loans
{
  configId: "config_001",
  merchantId: "merchant_123",
  name: "Quick Cash",
  interestRate: 20,
  penaltyRate: 5,
  minLoanAmount: 5000,
  maxLoanAmount: 50000,
  allowedFrequencies: ["daily", "weekly"],
  allowedTenors: [
    { minValue: 7, maxValue: 30, period: "DAYS" }
  ],
  isActive: true
}

// Example 2: Standard monthly loans
{
  configId: "config_002",
  merchantId: "merchant_123",
  name: "Standard Plan",
  interestRate: 15,
  penaltyRate: 3,
  minLoanAmount: 10000,
  maxLoanAmount: 200000,
  allowedFrequencies: ["weekly", "bi-weekly", "monthly"],
  allowedTenors: [
    { minValue: 1, maxValue: 6, period: "MONTHS" }
  ],
  isActive: true
}
```

### Indexes
- `merchantId` (for merchant-specific configs)
- `isActive` (for active configurations)
- `createdAt` (for sorting)

---

## 12. Collection: `crl_webhooks`

Webhook subscriptions and delivery logs for merchant integrations.

### Document Structure

```typescript
{
  webhookId: string;               // Unique webhook ID (document ID)
  merchantId: string;

  // Webhook Configuration
  url: string;                     // Webhook endpoint URL
  secret: string;                  // Secret for signature verification (hashed)
  events: string[];                // Subscribed events (e.g., ['loan.created', 'payment.success'])
  isActive: boolean;               // Whether webhook is active

  // Health Metrics
  consecutiveFailures: number;     // Count of consecutive delivery failures
  lastSuccessAt?: Timestamp;       // Last successful delivery
  lastFailureAt?: Timestamp;       // Last failed delivery
  lastFailureReason?: string;      // Reason for last failure

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `loan.created` | New loan created |
| `loan.activated` | Loan activated (card authorized) |
| `loan.completed` | Loan fully paid |
| `loan.defaulted` | Loan marked as defaulted |
| `loan.cancelled` | Loan cancelled |
| `payment.pending` | Payment scheduled |
| `payment.success` | Payment successful |
| `payment.failed` | Payment failed |
| `payment.overdue` | Payment overdue |
| `customer.created` | New customer onboarded |
| `credit.approved` | Credit assessment approved |
| `credit.declined` | Credit assessment declined |

### Indexes
- `merchantId` (for merchant webhooks)
- `isActive` (for active webhooks)
- `events` (for event filtering)

---

## 13. Collection: `crl_webhook_deliveries`

Log of webhook delivery attempts for debugging and retry.

### Document Structure

```typescript
{
  deliveryId: string;              // Unique delivery ID (document ID)
  webhookId: string;               // Reference to webhook subscription
  merchantId: string;

  // Event Details
  event: string;                   // Event type (e.g., 'loan.created')
  payload: Record<string, any>;    // Event payload sent

  // Delivery Status
  status: 'pending' | 'success' | 'failed';
  httpStatusCode?: number;         // Response status code
  responseBody?: string;           // Response body (truncated)
  errorMessage?: string;           // Error message if failed

  // Retry Information
  attemptCount: number;            // Number of delivery attempts
  nextRetryAt?: Timestamp;         // When to retry next (if failed)
  maxRetries: number;              // Maximum retry attempts (default: 5)

  // Timestamps
  createdAt: Timestamp;
  deliveredAt?: Timestamp;         // When successfully delivered
  updatedAt: Timestamp;
}
```

### Retry Strategy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 24 hours |

### Indexes
- `webhookId` (for webhook delivery history)
- `merchantId` (for merchant delivery logs)
- `status` (for pending/failed deliveries)
- `nextRetryAt` (for retry processing)
- `createdAt` (for sorting)

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
