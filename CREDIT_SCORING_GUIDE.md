# CRL Pay Credit Scoring System - Comprehensive Guide

## Table of Contents
1. [Overview](#overview)
2. [Credit Scoring Algorithm](#credit-scoring-algorithm)
3. [Scoring Components](#scoring-components)
4. [Decision Engine](#decision-engine)
5. [Credit Tiers](#credit-tiers)
6. [API Integration](#api-integration)
7. [Testing & Examples](#testing--examples)

---

## Overview

The CRL Pay Credit Scoring System is a sophisticated, multi-factor risk assessment engine designed to evaluate customer creditworthiness in real-time. The system analyzes **5 key dimensions** to generate a comprehensive credit score ranging from **0 to 1000 points**.

### Key Features
- ✅ **Real-time Assessment**: Instant credit decisions in <3 seconds
- ✅ **Multi-Factor Analysis**: 5 distinct scoring components
- ✅ **Transparent Decisions**: Clear reasoning for every approval/decline
- ✅ **Risk Flagging**: Automated identification of risk factors
- ✅ **Tier-Based Pricing**: Interest rates based on credit tier
- ✅ **Fraud Prevention**: Device fingerprinting & duplicate detection
- ✅ **First-Time Borrower Friendly**: Neutral scoring for new customers

---

## Credit Scoring Algorithm

### Total Score Breakdown (0-1000 points)

| Component | Max Points | Weight | Purpose |
|-----------|------------|--------|---------|
| **Identity Verification** | 200 | 20% | Validates customer identity via BVN |
| **Behavioral Intelligence** | 200 | 20% | Analyzes device & location patterns |
| **Financial Capacity** | 300 | 30% | Evaluates repayment ability |
| **Merchant Relationship** | 100 | 10% | Rewards customer tenure |
| **Credit History** | 200 | 20% | Assesses past loan performance |

### Score Ranges & Outcomes

| Score Range | Credit Tier | Decision | Interest Rate | Description |
|-------------|-------------|----------|---------------|-------------|
| **800-1000** | Platinum | Instant Approval | 1.5%/month | Excellent credit |
| **650-799** | Gold | Instant/Conditional | 1.8%/month | Good credit |
| **500-649** | Silver | Conditional | 2.0%/month | Fair credit |
| **400-499** | Bronze | Manual Review | 2.5%/month | Below threshold |
| **0-399** | Bronze | Declined | N/A | Poor credit |

---

## Scoring Components

### 1. Identity Verification (0-200 points)

**Purpose**: Verify customer identity and prevent fraud

#### 1.1 BVN Verification (0-100 points)
```typescript
✅ Valid 11-digit BVN = 100 points
❌ Invalid/Missing BVN = 0 points
```

**Implementation**:
- Validates BVN format (exactly 11 digits)
- In production: Integrates with BVN verification services (Mono, Dojah, SmileID)
- Prevents identity theft & fraud

#### 1.2 Duplicate Check (0-100 points)
```typescript
✅ No duplicate accounts = 100 points
❌ Duplicate detected = 0 points + Auto-decline
```

**Checks for duplicates across**:
- Email address
- Phone number
- BVN
- Device fingerprint

**Code Location**: [`credit-scoring.service.ts:127-153`](src/modules/credit/credit-scoring.service.ts#L127-L153)

---

### 2. Behavioral Intelligence (0-200 points)

**Purpose**: Analyze customer behavior patterns to detect fraud

#### 2.1 Device Trust (0-100 points)

| Scenario | Points | Risk Level |
|----------|--------|------------|
| **Same device as registration** | 100 | ✅ Low |
| **New but recognized device** | 50 | ⚠️ Medium |
| **Unrecognized device** | 30 | 🚫 High |
| **No fingerprint provided** | 30 | 🚫 High |

**How it works**:
```typescript
if (deviceFingerprint === customer.deviceFingerprint) {
  // Trusted device - highest score
  deviceScore = 100;
  decisionReasons.push('Device recognized and trusted');
} else {
  // New device - flag as risk
  riskFlags.push('New or unrecognized device');
  deviceScore = 50;
}
```

#### 2.2 Location Analysis (0-100 points)

| Scenario | Points | Risk Level |
|----------|--------|------------|
| **Same IP as registration** | 100 | ✅ Low |
| **Different IP, same region** | 60 | ⚠️ Medium |
| **No IP provided** | 40 | 🚫 High |

**Code Location**: [`credit-scoring.service.ts:158-193`](src/modules/credit/credit-scoring.service.ts#L158-L193)

---

### 3. Financial Capacity (0-300 points)

**Purpose**: Evaluate customer's ability to repay the loan

#### 3.1 Repayment Capacity (0-150 points)

**Debt-to-Income Ratio (DTI) Thresholds**:

| DTI Ratio | Points | Assessment |
|-----------|--------|------------|
| **< 30%** | 150 | Strong repayment capacity |
| **30-50%** | 100 | Moderate repayment capacity |
| **> 50%** | 50 | Tight repayment capacity |

**Calculation**:
```typescript
const monthlyRepayment = (requestedAmount * 1.02 * requestedTenure) / 4;
const estimatedIncome = requestedAmount * 3; // Heuristic
const dtiRatio = monthlyRepayment / estimatedIncome;
```

**Production Enhancement**:
- Integrate bank statement analysis
- Salary slip verification
- Transaction pattern analysis

#### 3.2 Affordability Check (0-150 points)

| Loan Amount | Points | Risk Level |
|-------------|--------|------------|
| **≤ ₦50,000** | 150 | ✅ Safe limit |
| **₦50,001 - ₦200,000** | 100 | ⚠️ Moderate |
| **₦200,001 - ₦500,000** | 50 | 🚫 High amount |
| **> ₦500,000** | 25 | 🚫 Very high |

**Code Location**: [`credit-scoring.service.ts:198-244`](src/modules/credit/credit-scoring.service.ts#L198-L244)

---

### 4. Merchant Relationship (0-100 points)

**Purpose**: Reward customer loyalty to the merchant

| Tenure with Merchant | Points | Assessment |
|---------------------|--------|------------|
| **30+ days** | 100 | Long-standing relationship |
| **7-29 days** | 70 | Established relationship |
| **1-6 days** | 40 | Recent relationship |
| **< 1 day** | 20 | New customer |
| **Different merchant** | 50 | Cross-merchant customer |

**Why This Matters**:
- Merchants know their customers better over time
- Reduces fraud risk
- Encourages customer retention

**Code Location**: [`credit-scoring.service.ts:249-280`](src/modules/credit/credit-scoring.service.ts#L249-L280)

---

### 5. Credit History (0-200 points)

**Purpose**: Evaluate past loan performance

#### 5.1 First-Time Borrowers
```typescript
if (totalLoans === 0) {
  historyScore = 100; // Neutral score
  decisionReasons.push('First-time borrower - neutral credit history');
}
```

#### 5.2 Repayment Track Record (0-100 points)

| On-Time Payment Rate | Points | Assessment |
|---------------------|--------|------------|
| **≥ 95%** | 100 | Excellent payment history |
| **80-94%** | 70 | Good payment history |
| **60-79%** | 40 | Fair payment history |
| **< 60%** | 10 | Poor payment history |

#### 5.3 Default History (0-100 points)

| Defaults | Points | Decision Impact |
|----------|--------|-----------------|
| **0 defaults** | 100 | ✅ No penalty |
| **1 default + 5+ completed** | 50 | ⚠️ Minor penalty |
| **2+ defaults** | 0 | 🚫 Auto-decline |

**Code Location**: [`credit-scoring.service.ts:285-327`](src/modules/credit/credit-scoring.service.ts#L285-L327)

---

## Decision Engine

### Auto-Decline Conditions

The system automatically declines if ANY of these conditions are met:

```typescript
❌ Customer is blacklisted
❌ More than 2 defaulted loans
❌ 3 or more active loans
❌ Credit score < 400
❌ Does not meet financier's eligibility criteria (if using financier plan)
```

### Financier Eligibility Rules

When a loan is being financed through a **financier's plan**, additional eligibility checks are performed based on the plan's `eligibilityCriteria`:

#### 1. Credit Score Requirements
```typescript
if (plan.eligibilityCriteria.minCreditScore) {
  if (customer.creditScore < plan.eligibilityCriteria.minCreditScore) {
    return 'declined'; // Does not meet minimum credit score
  }
}
```

#### 2. Income Verification
```typescript
if (plan.eligibilityCriteria.minMonthlyIncome) {
  if (customer.estimatedMonthlyIncome < plan.eligibilityCriteria.minMonthlyIncome) {
    return 'declined'; // Insufficient income
  }
}
```

#### 3. Debt-to-Income Ratio
```typescript
if (plan.eligibilityCriteria.maxDebtToIncome) {
  const dtiRatio = customer.totalDebt / customer.monthlyIncome;
  if (dtiRatio > plan.eligibilityCriteria.maxDebtToIncome) {
    return 'declined'; // Debt-to-income ratio too high
  }
}
```

#### 4. Employment Duration
```typescript
if (plan.eligibilityCriteria.minEmploymentMonths) {
  if (customer.employmentMonths < plan.eligibilityCriteria.minEmploymentMonths) {
    return 'declined'; // Employment duration too short
  }
}
```

#### 5. Email Domain Whitelisting (Corporate Staff)
```typescript
if (plan.eligibilityCriteria.allowedEmailDomains?.length > 0) {
  const customerDomain = '@' + customer.email.split('@')[1];
  if (!plan.eligibilityCriteria.allowedEmailDomains.includes(customerDomain)) {
    return 'declined'; // Email domain not whitelisted
  }
}
```

#### 6. Product Category Filtering
```typescript
if (plan.eligibilityCriteria.allowedCategories?.length > 0) {
  if (!plan.eligibilityCriteria.allowedCategories.includes(product.category)) {
    return 'declined'; // Product category not allowed for this plan
  }
}
```

### Combined Decision Flow

When using a financier plan, the decision flow becomes:

```typescript
// Step 1: Standard Credit Assessment (0-1000 score)
const creditScore = await assessCreditworthiness(customer);

// Step 2: Check Auto-Decline Conditions
if (hasAutoDeclineConditions(customer, creditScore)) {
  return 'declined';
}

// Step 3: Check Financier Eligibility Rules (if applicable)
if (fundingSource === 'financier' && plan.eligibilityCriteria) {
  const eligibilityCheck = await checkFinancierEligibility(
    customer,
    plan.eligibilityCriteria,
    product
  );

  if (!eligibilityCheck.passed) {
    return {
      decision: 'declined',
      reason: eligibilityCheck.failureReason,
      // e.g., "Does not meet minimum credit score of 650"
    };
  }
}

// Step 4: Standard Decision Logic
if (creditScore >= 700 && riskFlags.length === 0) {
  return 'instant_approval';
}
// ... rest of decision logic
```

### Decision Logic

```typescript
if (totalScore >= 700 && riskFlags.length === 0) {
  return 'instant_approval'; // Full amount approved
}

if (totalScore >= 500 && riskFlags.length <= 2) {
  return 'conditional_approval'; // 60-100% of requested amount
}

if (totalScore >= 400) {
  return 'manual_review'; // Requires admin review
}

return 'declined'; // Below minimum threshold
```

### Approved Terms Calculation

#### Instant Approval
- **Amount**: 100% of requested amount
- **Tenure**: Requested tenure
- **Interest Rate**: Based on credit tier

#### Conditional Approval
```typescript
const approvalPercentage =
  totalScore >= 600 ? 1.0 :  // 100%
  totalScore >= 500 ? 0.8 :  // 80%
  0.6;                       // 60%

approvedAmount = requestedAmount * approvalPercentage;
```

**Code Location**: [`credit-scoring.service.ts:338-405`](src/modules/credit/credit-scoring.service.ts#L338-L405)

---

## Credit Tiers

### Tier Benefits & Interest Rates

| Tier | Score Required | Interest Rate | Max Loan Amount | Tenure Options |
|------|---------------|---------------|-----------------|----------------|
| **Platinum** 💎 | 800-1000 | 1.5% monthly | Up to ₦5M | 1-52 weeks |
| **Gold** 🥇 | 650-799 | 1.8% monthly | Up to ₦2M | 1-52 weeks |
| **Silver** 🥈 | 500-649 | 2.0% monthly | Up to ₦500K | 1-26 weeks |
| **Bronze** 🥉 | 0-499 | 2.5% monthly | Up to ₦200K | 1-12 weeks |

### Tier Progression

Customers can improve their tier by:
- ✅ Making on-time payments
- ✅ Completing loans successfully
- ✅ Maintaining low DTI ratio
- ✅ Building relationship with merchant
- ✅ Avoiding defaults

---

## API Integration

### Perform Credit Assessment

**Endpoint**: `POST /api/v1/credit/assess`

**Request Body**:
```json
{
  "customerId": "cust_123abc",
  "merchantId": "merch_456def",
  "requestedAmount": 50000,
  "requestedTenure": 4,
  "purpose": "Business inventory purchase",
  "deviceFingerprint": "fp_xyz789",
  "ipAddress": "192.168.1.1"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Credit assessment completed successfully",
  "data": {
    "assessmentId": "assess_789ghi",
    "customerId": "cust_123abc",
    "merchantId": "merch_456def",

    "requestedAmount": 50000,
    "requestedTenure": 4,

    "totalScore": 735,
    "creditTier": "gold",
    "decision": "instant_approval",

    "approvedAmount": 50000,
    "approvedTenure": 4,
    "interestRate": 1.8,

    "decisionReasons": [
      "BVN verified successfully",
      "No duplicate accounts detected",
      "Device recognized and trusted",
      "Location consistent with registration",
      "Strong repayment capacity",
      "Loan amount within safe limits",
      "Established merchant relationship (15+ days)",
      "Excellent repayment history (95%+ on-time)",
      "No loan defaults"
    ],

    "riskFlags": [],

    "recommendations": [],

    "identityScore": 200,
    "behavioralScore": 200,
    "financialScore": 250,
    "merchantScore": 70,
    "historyScore": 15,

    "assessedAt": "2025-12-28T22:30:00Z",
    "expiresAt": "2025-12-29T22:30:00Z"
  }
}
```

### Other Endpoints

```typescript
// Get assessment by ID
GET /api/v1/credit/{assessmentId}

// Get customer's assessment history
GET /api/v1/credit/customer/{customerId}

// Get merchant's assessments
GET /api/v1/credit/merchant/{merchantId}

// Get credit statistics (Admin only)
GET /api/v1/credit/stats/overview
```

---

## Testing & Examples

### Example 1: Excellent Customer (Platinum Tier)

**Input**:
- First-time borrower
- BVN verified
- Trusted device
- Low loan amount (₦30,000)
- 4-week tenure

**Expected Output**:
- Score: 800+
- Tier: Platinum
- Decision: Instant Approval
- Interest: 1.5%/month

### Example 2: New Customer (Silver Tier)

**Input**:
- First-time borrower
- BVN verified
- New device
- Moderate amount (₦100,000)
- Registered 2 days ago

**Expected Output**:
- Score: 500-649
- Tier: Silver
- Decision: Conditional Approval (80% = ₦80,000)
- Interest: 2.0%/month

### Example 3: High-Risk Customer (Declined)

**Input**:
- 3 defaulted loans
- Poor payment history (40% on-time)
- High requested amount (₦500,000)
- Unrecognized device

**Expected Output**:
- Score: <400
- Tier: Bronze
- Decision: Declined
- Reasons: "Multiple loan defaults", "Poor repayment history"

### Manual Testing via Swagger

1. Navigate to `http://localhost:3006/api`
2. Authenticate with admin/merchant JWT token
3. Use `/credit/assess` endpoint
4. Vary inputs to test different scenarios

---

## Production Enhancements

### Recommended Integrations

1. **BVN Verification Services**:
   - Mono: https://mono.co
   - Dojah: https://dojah.io
   - SmileID: https://smileidentity.com

2. **Bank Statement Analysis**:
   - Okra: https://okra.ng
   - Mono Connect

3. **Credit Bureau Integration**:
   - CRC Credit Bureau
   - FirstCentral Credit Bureau

4. **Device Intelligence**:
   - FingerprintJS: https://fingerprint.com
   - Seon Fraud Prevention

5. **Machine Learning**:
   - Train ML models on historical data
   - Improve income estimation
   - Enhance fraud detection

---

## Audit & Compliance

### Data Stored in Firestore

Collection: `crl_credit_assessments`

**Retention Policy**:
- Assessments expire after 24 hours
- Historical data retained for 7 years (regulatory requirement)
- Customer can request assessment deletion (GDPR compliance)

### Logging

Every assessment logs:
- ✅ All scoring components
- ✅ Decision rationale
- ✅ Risk flags identified
- ✅ Timestamp & user ID
- ✅ Device & IP information

**View Logs**: Winston logger outputs to console and file

---

## Support & Troubleshooting

### Common Issues

**Issue**: Assessment returns 0 score
- **Cause**: Customer not found
- **Fix**: Ensure customer exists in database

**Issue**: All assessments declined
- **Cause**: BVN validation failing
- **Fix**: Check BVN format (exactly 11 digits)

**Issue**: Conditional approval with low amount
- **Cause**: High requested amount + low score
- **Fix**: Customer should request lower amount or build credit history

---

## Changelog

### Version 1.0.0 (December 2025)
- ✅ Initial implementation
- ✅ 5-component scoring algorithm
- ✅ 4-tier credit system
- ✅ Real-time assessment API
- ✅ Comprehensive logging

### Roadmap
- 🔄 ML-based scoring (Q1 2026)
- 🔄 BVN service integration
- 🔄 Bank statement analysis
- 🔄 Credit bureau integration
- 🔄 Advanced fraud detection

---

## Contact

For questions or support:
- **Email**: support@crlpay.com
- **Documentation**: `/IMPLEMENTATION_GUIDE.md`
- **API Docs**: http://localhost:3006/api

---

**Last Updated**: December 28, 2025
**Version**: 1.0.0
**Author**: CRL Pay Development Team
