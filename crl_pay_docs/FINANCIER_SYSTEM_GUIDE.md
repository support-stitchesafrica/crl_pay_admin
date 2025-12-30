# Financier System Implementation Guide

## Overview

The Financier System enables external funding institutions (banks, microfinance institutions, investment firms) to provide capital for BNPL financing. This creates a multi-party ecosystem where:
- **Financiers** create financing plans with custom terms
- **CRL Pay Admins** approve plans and map them to merchants
- **Merchants** offer these plans to their customers
- **Customers** access better financing options

**Implementation Date**: December 2024
**Status**: ✅ COMPLETED

---

## 1. Backend Implementation

### Module Structure

```
src/modules/financiers/
├── financiers.controller.ts          # Financier auth & profile management
├── financiers.service.ts             # Financier business logic
├── plans.service.ts                  # Financing plans logic
├── financing-plans.controller.ts     # Public financing plans endpoints
├── admin-plans.controller.ts         # Admin plan management
├── plan-mappings.service.ts          # Plan-merchant mapping logic
├── plan-mappings.controller.ts       # Mapping CRUD endpoints
├── financiers.module.ts              # Module registration
└── dto/
    ├── register-financier.dto.ts
    ├── login-financier.dto.ts
    ├── create-plan.dto.ts
    ├── update-plan.dto.ts
    └── update-plan-status.dto.ts
```

### Key Features

#### 1. Financier Registration & Authentication
- JWT-based authentication
- Admin approval workflow
- Profile management
- Fund tracking (available vs allocated)

#### 2. Financing Plans

```typescript
interface FinancingPlan {
  planId: string;
  financierId: string;
  name: string;
  description?: string;
  
  // Loan Terms
  tenor: {
    value: number;                 // e.g., 6, 12, 90
    period: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  };
  interestRate: number;            // Annual percentage
  minimumAmount: number;
  maximumAmount: number;
  
  // Payment Terms
  gracePeriod: {
    value: number;
    period: 'DAYS' | 'WEEKS' | 'MONTHS';
  };
  lateFee: {
    type: 'fixed' | 'percentage';
    amount: number;
  };
  allowEarlyRepayment: boolean;
  
  // Eligibility Criteria (optional)
  eligibilityCriteria?: {
    minCreditScore?: number;
    minMonthlyIncome?: number;
    maxDebtToIncome?: number;
    minEmploymentMonths?: number;
    allowedEmailDomains?: string[];  // For corporate staff
    allowedCategories?: string[];    // Product categories
  };
  
  // Status & Tracking
  status: 'pending' | 'approved' | 'inactive';
  isActive: boolean;
  totalFundsAllocated: number;       // From financier
  fundsAllocatedToMerchants: number; // Via mappings
  totalLoansCreated: number;
}
```

#### 3. Plan-Merchant Mappings

```typescript
interface PlanMerchantMapping {
  mappingId: string;
  planId: string;
  merchantId: string;
  financierId: string;
  
  // Fund Allocation
  fundsAllocated: number;        // Total allocated to merchant
  currentAllocation: number;     // Currently in use
  expirationDate: Timestamp;
  
  // Usage Tracking
  totalLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  defaultRate: number;
  
  // Metadata
  status: 'active' | 'inactive' | 'suspended';
  mappedBy: string;              // Admin who created
  mappedAt: Timestamp;
}
```

#### 4. Fund Allocation Logic ⚠️ CRITICAL

Correct implementation of financier fund tracking:

```typescript
// When admin approves plan
await db.collection('crl_financiers').doc(financierId).update({
  availableFunds: FieldValue.increment(fundsAllocated),
  allocatedFunds: FieldValue.increment(fundsAllocated),
});

// When admin creates mapping
await db.collection('crl_financiers').doc(financierId).update({
  availableFunds: FieldValue.increment(-fundsAllocated),  // Decrease
  allocatedFunds: FieldValue.increment(fundsAllocated),   // Increase
});

// When admin updates mapping
const difference = newAmount - oldAmount;
await db.collection('crl_financiers').doc(financierId).update({
  availableFunds: FieldValue.increment(-difference),
  allocatedFunds: FieldValue.increment(difference),
});

// When admin deletes mapping
await db.collection('crl_financiers').doc(financierId).update({
  availableFunds: FieldValue.increment(fundsAllocated),   // Increase
  allocatedFunds: FieldValue.increment(-fundsAllocated),  // Decrease
});
```

#### 5. Validation Rules

Implemented comprehensive validation:
- ✅ No duplicate mappings (one plan per merchant)
- ✅ Cannot reduce allocation below current usage
- ✅ Cannot delete mapping with active usage
- ✅ Insufficient funds validation
- ✅ All validation errors return 400 (not 500)

### API Endpoints

#### Financier Endpoints
```
POST   /api/v1/financiers/register
POST   /api/v1/financiers/login
GET    /api/v1/financiers/me
PUT    /api/v1/financiers/me
GET    /api/v1/financiers/me/plans
POST   /api/v1/financiers/me/plans
PUT    /api/v1/financiers/me/plans/:planId
DELETE /api/v1/financiers/me/plans/:planId
GET    /api/v1/financiers/me/loans
GET    /api/v1/financiers/me/analytics

# Admin Only
GET    /api/v1/financiers/all?status=approved
PUT    /api/v1/financiers/:id/approve
PUT    /api/v1/financiers/:id/reject
PUT    /api/v1/financiers/:id/suspend
PUT    /api/v1/financiers/:id/funds/approve
```

#### Admin - Financing Plans
```
POST   /api/v1/admin/financing-plans/:planId/approve
POST   /api/v1/admin/financing-plans/:planId/allocate-funds
PUT    /api/v1/admin/financing-plans/:planId/status
```

#### Plan-Merchant Mappings
```
GET    /api/v1/plan-merchant-mappings
GET    /api/v1/plan-merchant-mappings/:id
POST   /api/v1/plan-merchant-mappings
PUT    /api/v1/plan-merchant-mappings/:id
DELETE /api/v1/plan-merchant-mappings/:id
```

#### Public Endpoints
```
GET    /api/v1/financing-plans
GET    /api/v1/financing-plans/:planId
```

---

## 2. Financier Dashboard

**Location**: `apps/financier-dashboard/`
**Port**: 3009
**Technology**: React, TypeScript, Vite, TailwindCSS

### Pages Implemented

#### 1. Plans Page (`/plans`)
- Display all financing plans created by financier
- Show fund allocation metrics:
  - Total Funds (from financier)
  - Allocated to Merchants (via mappings)
  - Available Funds (for new mappings)
  - Total Loans Created
- Plan management:
  - Create new plans
  - Edit existing plans
  - Delete pending plans
  - View plan details
- Status indicators (pending/approved/inactive)

#### 2. Mapped Merchants Page (`/merchants`)
- Display all plan-merchant mappings
- Show enriched data:
  - Merchant names (not just IDs)
  - Plan names (not just IDs)
  - Financier names
- Fund allocation per mapping:
  - Funds Allocated
  - Current Usage
  - Available Funds
  - Utilization Percentage
- Performance metrics:
  - Total Loans
  - Total Disbursed
  - Total Repaid
  - Expiration Date
- Status badges (active/inactive/suspended)

### Services Created

```typescript
// apps/financier-dashboard/src/services/plans.service.ts
export const getPlans = async (): Promise<FinancingPlan[]>;
export const createPlan = async (data: CreatePlanDto);
export const updatePlan = async (planId: string, data: UpdatePlanDto);
export const deletePlan = async (planId: string);

// apps/financier-dashboard/src/services/mappings.service.ts
export const getMappings = async (financierId?: string): Promise<PlanMerchantMapping[]>;

// apps/financier-dashboard/src/services/financier.service.ts
export const getProfile = async (): Promise<Financier>;
export const updateProfile = async (data: UpdateProfileDto);
```

---

## 3. Merchant Dashboard Updates

### New Page: Financing Plans (`/financing-plans`)

**Purpose**: View BNPL plans mapped to merchant by admin

**Features**:
- Display all financing plans available to merchant
- Show plan details:
  - Interest rate, tenor, loan range
  - Grace period, late fees
  - Financier information
- Fund allocation metrics:
  - Funds Allocated to merchant
  - Current Usage
  - Available for customers
  - Utilization percentage
- Performance tracking:
  - Total Loans
  - Total Disbursed
  - Total Repaid
- Status indicators

### Additional Pages Created
- Transactions (`/transactions`) - Placeholder
- Customers (`/customers`) - Placeholder
- Analytics (`/analytics`) - Placeholder

### Services Created

```typescript
// apps/merchant-dashboard/src/services/plans.service.ts
export const getMappedPlans = async (): Promise<PlanMerchantMapping[]>;
export const getPlanDetails = async (planId: string): Promise<FinancingPlan>;
export const getMultiplePlanDetails = async (planIds: string[]): Promise<FinancingPlan[]>;

// apps/merchant-dashboard/src/services/financiers.service.ts
export const getFinanciers = async (status?: string): Promise<Financier[]>;
```

---

## 4. Admin Dashboard Updates

### 1. Financing Plans Page (`/financing-plans`)

**Features**:
- View all financing plans across all financiers
- Approve pending plans with fund allocation
- Allocate additional funds to approved plans
- Enable/disable plans (activate/deactivate)
- Filter by status (all/pending/approved/inactive)
- Display enriched data with financier names
- Modal-based workflows:
  - Plan approval with fund allocation input
  - Additional fund allocation
  - Status toggling

### 2. Plan-Merchant Mapping Page (`/plan-merchant-mappings`)

**Features**:
- View all plan-merchant mappings across system
- Create new mappings:
  - Select financier → plan → merchant
  - Set fund allocation amount
  - Set expiration date
- Edit existing mappings:
  - Adjust fund allocation
  - Change expiration date
  - Update status
- Delete mappings (with validation)
- Filter by:
  - Status (active/inactive/suspended)
  - Financier
  - Merchant
  - Plan
- Comprehensive validation:
  - Duplicate prevention
  - Fund availability checks
  - Usage validation before deletion
- Real-time fund allocation display

### Services Created/Updated

```typescript
// apps/admin-dashboard/src/services/plans.service.ts
export const getAllPlans = async (): Promise<FinancingPlan[]>;
export const approvePlan = async (planId: string, fundsAllocated: number);
export const allocateFunds = async (planId: string, additionalFunds: number);
export const updatePlanStatus = async (planId: string, isActive: boolean);

// apps/admin-dashboard/src/services/financier.service.ts
export const getAll = async (status?: string): Promise<Financier[]>;
export const approve = async (financierId: string);
export const reject = async (financierId: string, reason: string);
export const suspend = async (financierId: string, reason: string);
export const approveFunds = async (financierId: string, amount: number);
export const getPlans = async (financierId?: string): Promise<FinancingPlan[]>;
export const getMappings = async (filters?: {...}): Promise<PlanMerchantMapping[]>;
export const createMapping = async (data: {...});
export const updateMapping = async (mappingId: string, data: {...});
export const deleteMapping = async (mappingId: string);
```

---

## 5. Testing & Verification

### Manual Testing Checklist

#### Financier Flow
- [ ] Register as financier
- [ ] Admin approves financier
- [ ] Create financing plan
- [ ] Admin approves plan with fund allocation
- [ ] View plan on financier dashboard
- [ ] Check fund allocation display
- [ ] Admin creates plan-merchant mapping
- [ ] View mapping on "Mapped Merchants" page
- [ ] Verify merchant and plan names display
- [ ] Check fund allocation metrics

#### Merchant Flow
- [ ] Login to merchant dashboard
- [ ] Navigate to "Financing Plans" page
- [ ] Verify mapped plans display
- [ ] Check fund allocation metrics
- [ ] Verify financier name displays
- [ ] Check plan details (interest, tenor, etc.)

#### Admin Flow
- [ ] View all financing plans
- [ ] Approve pending plan with fund allocation
- [ ] Allocate additional funds to approved plan
- [ ] Enable/disable plan
- [ ] View all plan-merchant mappings
- [ ] Create new mapping
- [ ] Try creating duplicate mapping (should fail)
- [ ] Try allocating more than available funds (should fail)
- [ ] Update mapping fund allocation
- [ ] Try deleting mapping with active usage (should fail)
- [ ] Delete mapping with no usage (should succeed)

#### Fund Allocation Verification
- [ ] Financier's `availableFunds` decreases when mapping created
- [ ] Financier's `allocatedFunds` increases when mapping created
- [ ] Both adjust correctly on mapping update
- [ ] Both adjust correctly on mapping deletion
- [ ] Plan's `fundsAllocatedToMerchants` updates correctly

---

## 6. Known Limitations

1. **No loan creation using financier plans yet** - Backend ready, frontend integration pending
2. **No real-time fund updates** - Requires WebSocket or polling
3. **No mapping approval workflow** - Mappings are active immediately
4. **No bulk operations** - Create/update/delete one at a time
5. **No audit trail** - Mapping changes not tracked historically

---

## 7. Future Enhancements

1. **Loan Integration**: Connect loan creation to financier plans
2. **Notifications**: Email/SMS alerts for mapping changes
3. **Analytics**: Detailed performance analytics per mapping
4. **Audit Trail**: Track all mapping changes with history
5. **Bulk Operations**: Import/export mappings via CSV
6. **Auto-renewal**: Automatic mapping renewal before expiration
7. **Risk Management**: Credit limits per merchant
8. **Reporting**: Comprehensive financial reports for financiers

---

## 8. Bug Fixes

### Fund Allocation Mathematics
**Issue**: Financier's `availableFunds` not decremented when allocating to merchants
**Fix**: Proper increment/decrement logic in mapping operations
**Files**: `src/modules/financiers/plan-mappings.service.ts`

### API Response Handling
**Issue**: Merchants API returns wrapped response `{ success, message, data }`
**Fix**: Updated frontend to extract `response.data.data`
**Files**: All dashboard services

### Validation Error Codes
**Issue**: Validation errors returning 500 Internal Server Error
**Fix**: Changed to `BadRequestException` (400 status code)
**Files**: `src/modules/financiers/plan-mappings.service.ts`

### Data Enrichment
**Issue**: Displaying IDs instead of names (merchant, plan, financier)
**Fix**: Fetch related data and enrich before display
**Files**: All dashboard pages displaying mappings

---

**Last Updated**: December 30, 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
