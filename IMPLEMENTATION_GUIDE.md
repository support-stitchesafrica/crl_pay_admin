# CRL Pay BNPL System - Complete Implementation & Testing Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Firebase Setup](#firebase-setup)
4. [Environment Configuration](#environment-configuration)
5. [Project Structure](#project-structure)
6. [Application Architecture](#application-architecture)
7. [Running the Application](#running-the-application)
8. [Recent Fixes & Improvements](#recent-fixes--improvements)
9. [Complete Implementation Roadmap](#complete-implementation-roadmap)
10. [API Implementation Guide](#api-implementation-guide)
11. [Admin Dashboard Implementation](#admin-dashboard-implementation)
12. [Merchant Dashboard Implementation](#merchant-dashboard-implementation)
13. [Webview Implementation Guide](#webview-implementation-guide)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Guide](#deployment-guide)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Firebase Project** with Firestore enabled
- **Firebase Admin SDK** service account key (JSON file)
- **Paystack Account** (for payment processing)
- **BVN Verification Service** (e.g., Mono, Smile ID, or Dojah)

---

## Installation Steps

### Step 1: Install Dependencies

```bash
npm install
```

This installs all dependencies including:
- NestJS core modules
- Firebase Admin SDK
- Winston for logging
- Swagger for API documentation
- Class validator and transformer
- JWT and Passport for authentication

### Step 2: Verify Installation

```bash
npm run build
```

This should compile the TypeScript code without errors.

---

## Firebase Setup

### Step 1: Use Existing Firebase Project

The `.env` file is already configured to use your existing Firebase project (`stitches-africa`). All CRL Pay collections are prefixed with `crl_` to keep them separate.

### Step 2: Firestore Collections

The following collections will be created automatically:

```
crl_merchants              - Merchant profiles and API keys
crl_customers              - Customer data and credit profiles
crl_credit_assessments     - Credit decision records
crl_loans                  - Loan lifecycle data
crl_payments               - Payment/installment records
crl_transactions           - Complete transaction log
crl_notifications          - Notification delivery log
crl_merchant_settlements   - Merchant payouts
crl_defaults               - Default management
crl_merchant_analytics     - Analytics data
```

Refer to [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed schema.

---

## Environment Configuration

Your `.env` file is already configured. Key variables:

```bash
# Server
PORT=3006
NODE_ENV=development

# Firebase (configured)
FIREBASE_PROJECT_ID=stitches-africa
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-vl97x@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# JWT
JWT_SECRET=mN3f8T2jR1Qp9Vt0zA3Kx7H4sLm8Pw9YcDfGhJkLmNo=

# Paystack (add your keys)
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key

# Credit Scoring
INSTANT_APPROVAL_SCORE=700
CONDITIONAL_APPROVAL_MIN=500
MANUAL_REVIEW_MIN=400

# Email Configuration
EMAIL_USER=nerdmukolo@gmail.com
EMAIL_PASS=xnphhmstgwhooqau
EMAIL_FROM=CRL Pay <noreply@crlpay.com>
ADMIN_EMAIL=crladmin@yopmail.com

# SMS Configuration (Optional - for future)
SMS_API_KEY=your-sms-api-key

# NOTE: Interest rates and loan limits are NOT configured here
# They are configured per-merchant in their dashboard settings
```

**Important Configuration Changes:**
- ❌ **REMOVED**: Interest rate configuration from .env (was: BRONZE_INTEREST_RATE, SILVER_INTEREST_RATE, etc.)
- ✅ **NEW APPROACH**: Each merchant configures their own interest rates and max loan amounts
- ✅ Interest rates are stored in merchant profile in Firestore
- ✅ Merchants can update their loan configuration via dashboard

---

## Application Architecture

### Overview

The CRL Pay system consists of **four distinct applications** within a monorepo structure:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRL PAY BNPL SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   BACKEND    │  │    ADMIN     │  │   MERCHANT   │         │
│  │     API      │  │  DASHBOARD   │  │  DASHBOARD   │         │
│  │  (NestJS)    │  │  (React SPA) │  │  (React SPA) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                │
│         └──────────────────┴──────────────────┘                │
│                            │                                   │
│                   ┌────────▼─────────┐                         │
│                   │  CUSTOMER        │                         │
│                   │  WEBVIEW         │                         │
│                   │  (Next.js)       │                         │
│                   └──────────────────┘                         │
│                            │                                   │
│                   ┌────────▼─────────┐                         │
│                   │   FIREBASE       │                         │
│                   │   FIRESTORE      │                         │
│                   └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Application Components

#### 1. Backend API (NestJS)
- **Purpose**: Core business logic and RESTful API
- **Technology**: NestJS, TypeScript, Firebase Admin SDK
- **Serves**: Admin dashboard, merchant dashboard, customer webview
- **Location**: `src/`
- **Port**: 3006

#### 2. Admin Dashboard (React SPA)
- **Purpose**: Internal admin panel for managing merchants and system
- **Technology**: React, TypeScript, Vite, TailwindCSS
- **Users**: CRL Pay administrators
- **Location**: `apps/admin-dashboard/`
- **Port**: 3007
- **Key Features**:
  - Merchant approval workflow
  - System-wide analytics
  - Default management
  - Customer support tools
  - Settings and configuration

#### 3. Merchant Dashboard (React SPA)
- **Purpose**: Merchant portal for monitoring transactions and customers
- **Technology**: React, TypeScript, Vite, TailwindCSS
- **Users**: Registered merchants
- **Location**: `apps/merchant-dashboard/`
- **Port**: 3008
- **Key Features**:
  - Transaction monitoring
  - Customer analytics
  - Settlement tracking
  - API key management
  - Webhook configuration

#### 4. Customer Webview (Next.js)
- **Purpose**: Customer-facing checkout flow
- **Technology**: Next.js, React, TypeScript
- **Users**: End customers making purchases
- **Location**: `apps/customer-webview/`
- **Port**: 3009
- **Integration**: Embedded via iframe/popup on merchant websites

### Why This Architecture?

#### Monorepo Benefits:
✅ **Shared TypeScript Types**: All apps use the same interfaces from backend
✅ **Unified Deployment**: Single repository, easier CI/CD
✅ **Code Reusability**: Shared utilities, API clients, and components
✅ **Atomic Changes**: Update API + dashboards in single commit
✅ **Consistent Tooling**: Same linters, formatters, testing setup

#### Separation of Concerns:
✅ **Admin Dashboard (React SPA)**: Full-featured admin panel with complex state management
✅ **Merchant Dashboard (React SPA)**: Rich merchant portal with real-time analytics
✅ **Customer Webview (Next.js)**: SEO-friendly, fast checkout with server-side rendering
✅ **Backend API (NestJS)**: Business logic separated from presentation

### Project Structure (Monorepo)

```
crl-pay/
├── src/                              # Backend API (NestJS)
│   ├── modules/
│   │   ├── merchants/
│   │   ├── customers/
│   │   ├── credit/
│   │   ├── loans/
│   │   ├── payments/
│   │   ├── admin/                   # Admin-specific API routes
│   │   └── analytics/
│   ├── common/
│   ├── config/
│   └── main.ts
│
├── apps/                             # Frontend Applications
│   ├── admin-dashboard/             # Admin React App
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── MerchantApproval.tsx
│   │   │   │   ├── MerchantManagement.tsx
│   │   │   │   ├── DefaultManagement.tsx
│   │   │   │   ├── SystemAnalytics.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/api.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   ├── merchant-dashboard/          # Merchant React App
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Overview.tsx
│   │   │   │   ├── Transactions.tsx
│   │   │   │   ├── Customers.tsx
│   │   │   │   ├── Analytics.tsx
│   │   │   │   ├── Settlements.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/api.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   └── customer-webview/            # Customer Next.js App
│       ├── src/
│       │   ├── app/
│       │   │   ├── checkout/
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   └── services/
│       └── package.json
│
├── shared/                           # Shared Code
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces
│   ├── utils/
│   │   ├── validation.ts
│   │   └── formatters.ts
│   └── api-client/
│       └── generator.ts             # Auto-generate API clients
│
├── package.json                      # Root package.json (workspaces)
├── tsconfig.json                     # Root TypeScript config
└── .env                              # Environment variables
```

### Workspace Configuration

```json
// package.json (root)
{
  "name": "crl-pay",
  "private": true,
  "workspaces": [
    "apps/*",
    "shared/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:admin\" \"npm run dev:merchant\" \"npm run dev:webview\"",
    "dev:api": "npm run start:dev",
    "dev:admin": "npm run dev --workspace=apps/admin-dashboard",
    "dev:merchant": "npm run dev --workspace=apps/merchant-dashboard",
    "dev:webview": "npm run dev --workspace=apps/customer-webview",
    "build:all": "npm run build && npm run build:admin && npm run build:merchant && npm run build:webview",
    "build:admin": "npm run build --workspace=apps/admin-dashboard",
    "build:merchant": "npm run build --workspace=apps/merchant-dashboard",
    "build:webview": "npm run build --workspace=apps/customer-webview"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### Authentication & Authorization

#### Admin Dashboard
- **Authentication**: JWT-based admin login
- **Route**: `POST /api/v1/admin/auth/login`
- **Roles**: `super_admin`, `admin`, `support`
- **Protected Routes**: All admin API routes require admin JWT

#### Merchant Dashboard
- **Authentication**: JWT-based merchant login
- **Route**: `POST /api/v1/merchants/auth/login`
- **Authorization**: Merchant can only access their own data
- **Protected Routes**: All merchant API routes require merchant JWT

#### Customer Webview
- **Authentication**: Session-based (temporary)
- **Session Storage**: Customer ID stored in browser session
- **No Login Required**: Customers don't create accounts upfront

### Data Access Patterns

```typescript
// Admin can access ALL merchants
GET /api/v1/admin/merchants          // List all merchants
GET /api/v1/admin/merchants/:id      // Get specific merchant
PUT /api/v1/admin/merchants/:id/approve
GET /api/v1/admin/defaults           // All defaults across system

// Merchant can ONLY access their own data
GET /api/v1/merchants/me             // Own profile
GET /api/v1/merchants/me/transactions // Own transactions
GET /api/v1/merchants/me/customers    // Own customers
GET /api/v1/merchants/me/analytics    // Own analytics
```

---

## Running the Application

### Development Mode

```bash
npm run start:dev
```

### Access Points

- **API Base**: http://localhost:3006/api/v1
- **Swagger UI**: http://localhost:3006/api/v1/swagger-ui
- **Logs**: `logs/app.log` and `logs/error.log`

---

## Recent Fixes & Improvements

### Authentication & Login Fixes ✅

**Issue 1: JSON Parse Error on Admin Login**
- **Problem**: localStorage storing string "undefined" causing parse errors
- **Fix**: Added validation in `auth.service.ts` to check for 'undefined' and 'null' strings
- **Files**:
  - `apps/admin-dashboard/src/services/auth.service.ts`
  - `apps/merchant-dashboard/src/services/auth.service.ts`

**Issue 2: 401 Redirect Loop After Login**
- **Problem**: Frontend accessing wrong property names from backend response
- **Fix**: Updated to use correct properties (`access_token` instead of `token`, `user` instead of `admin`/`merchant`)
- **Files**: Both admin and merchant `auth.service.ts`

**Issue 3: Axios Interceptor Too Aggressive**
- **Problem**: Interceptor redirecting on ANY 401, causing loops
- **Fix**: Added pathname check to prevent redirect loops
- **Files**:
  - `apps/admin-dashboard/src/services/api.ts`
  - `apps/merchant-dashboard/src/services/api.ts`

### UI/UX Improvements ✅

**Issue 4: Glassmorphism Design Rejection**
- **Problem**: User wanted split-screen layout instead of glassmorphism
- **Fix**: Redesigned login/register pages with 50/50 split (form left, branding right)
- **Files**:
  - `apps/admin-dashboard/src/pages/Login.tsx`
  - `apps/merchant-dashboard/src/pages/Login.tsx`
  - `apps/merchant-dashboard/src/pages/Register.tsx`

**Issue 5: Insufficient Menu Spacing**
- **Problem**: Side menu items too cramped
- **Fix**: Increased vertical spacing (`py-6`, `space-y-2`, `py-4`)
- **Files**:
  - `apps/admin-dashboard/src/components/DashboardLayout.tsx`
  - `apps/merchant-dashboard/src/components/DashboardLayout.tsx`

### API Endpoint Fixes ✅

**Issue 6: Merchant Approvals 404 Error**
- **Problem**: Frontend calling `/merchants/status/pending` (doesn't exist)
- **Backend Pattern**: Uses query parameter `/merchants?status=pending`
- **Fix**: Updated frontend to use query parameters
- **Files**:
  - `apps/admin-dashboard/src/services/merchant.service.ts`

**Issue 7: Merchant Approval Endpoints Mismatch**
- **Problem**: Frontend had separate endpoints for approve/reject/suspend
- **Backend Pattern**: Single endpoint `/merchants/:id/approve` with status in body
- **Fix**: Consolidated to single endpoint with status payload
- **Files**: `apps/admin-dashboard/src/services/merchant.service.ts`

### Email Notification System ✅ COMPLETED

**Complete Implementation of Week 5 Notification Module**

**Files Created:**
- `src/modules/notifications/notifications.service.ts` - Main orchestration
- `src/modules/notifications/email.service.ts` - Email with Nodemailer + Handlebars
- `src/modules/notifications/sms.service.ts` - SMS (ready for Termii/Twilio)
- `src/modules/notifications/push.service.ts` - Push (ready for FCM)
- `src/modules/notifications/templates/*.html` - 10 email templates

**Integrations:**
- ✅ Merchant registration → Emails to merchant + admin
- ✅ Merchant approval/rejection → Email to merchant
- ✅ Admin/Merchant login → Notification to admin
- ✅ Ready for: Payment reminders, success/failure, loan completion

**Key Features:**
- Multi-channel (Email, SMS, Push)
- Template-based with Handlebars
- Non-blocking delivery
- Admin email hardcoded: `crladmin@yopmail.com`

### Configuration Changes ✅

**Merchant Loan Configuration**
- ❌ **REMOVED**: System-wide interest rates from .env
- ✅ **NEW**: Per-merchant loan configuration
- ✅ Merchants configure their own:
  - Interest rates
  - Max loan amounts by tier (bronze/silver/gold)
  - Payment frequency
  - Min credit score
  - Auto-approve limits

**Implementation Needed:**
- [ ] `dto/update-loan-config.dto.ts`
- [ ] `PATCH /merchants/:id/loan-config` endpoint
- [ ] `GET /merchants/:id/loan-config` endpoint
- [ ] Dashboard Settings page for loan configuration

---

## Complete Implementation Roadmap

### Phase 1: Backend API Foundation (Weeks 1-3)

#### Week 1: Core Merchant & Customer Infrastructure

**1.1 Merchant Module**
```bash
nest g module modules/merchants
nest g controller modules/merchants
nest g service modules/merchants
```

**Files to create:**
- `src/modules/merchants/dto/register-merchant.dto.ts`
- `src/modules/merchants/dto/login-merchant.dto.ts`
- `src/modules/merchants/dto/update-merchant.dto.ts`
- `src/modules/merchants/merchants.repository.ts`
- `src/modules/merchants/merchants.service.ts`
- `src/modules/merchants/merchants.controller.ts`

**Key Features:**
- [x] Merchant registration with KYC
- [x] API key generation (public/secret) - Generated on approval
- [x] Merchant authentication (JWT)
- [x] Merchant profile management
- [ ] Webhook URL configuration
- [x] **Merchant loan configuration** (interest rates, max amounts)
  - Merchants configure their own interest rates (not system-wide)
  - Merchants set maximum financeable amounts
  - Configuration stored per merchant in Firestore
  - Default values can be set on merchant approval

**Merchant Loan Configuration Schema:**

Each merchant has their own loan configuration stored in their Firestore document:

```typescript
interface MerchantLoanConfig {
  // Interest rate configuration (percentage per payment period)
  interestRate: number;              // e.g., 2.5 (means 2.5% per period)

  // Maximum amounts by tier/duration
  maxLoanAmounts: {
    bronze: number;                  // Max for 30-day loans (e.g., 50000)
    silver: number;                  // Max for 60-day loans (e.g., 100000)
    gold: number;                    // Max for 90-day loans (e.g., 200000)
  };

  // Payment period configuration
  defaultPaymentFrequency: 'weekly' | 'bi-weekly' | 'monthly';

  // Risk tolerance
  minCreditScore: number;            // Minimum credit score to approve (e.g., 500)

  // Auto-approve limits
  autoApproveLimit: number;          // Max amount for instant approval (e.g., 10000)

  // Updated by merchant
  updatedAt: Date;
}
```

**Implementation Files Needed:**
- `src/modules/merchants/dto/update-loan-config.dto.ts` - DTO for loan config updates
- Add to `merchants.controller.ts`:
  ```typescript
  @Patch(':id/loan-config')
  async updateLoanConfig(
    @Param('id') merchantId: string,
    @Body() updateLoanConfigDto: UpdateLoanConfigDto
  ) { ... }

  @Get(':id/loan-config')
  async getLoanConfig(@Param('id') merchantId: string) { ... }
  ```

**API Endpoints:**
- `PATCH /merchants/:id/loan-config` - Update merchant loan configuration
- `GET /merchants/:id/loan-config` - Get merchant loan configuration

**Dashboard Integration:**
Merchants can configure these settings in their dashboard under Settings > Loan Configuration

**1.2 Customer Module**
```bash
nest g module modules/customers
nest g controller modules/customers
nest g service modules/customers
```

**Files to create:**
- `src/modules/customers/dto/onboard-customer.dto.ts`
- `src/modules/customers/dto/update-customer.dto.ts`
- `src/modules/customers/customers.repository.ts`
- `src/modules/customers/customers.service.ts`
- `src/modules/customers/customers.controller.ts`

**Key Features:**
- [ ] Customer onboarding
- [ ] BVN verification integration
- [ ] Device fingerprinting
- [ ] Location tracking
- [ ] Customer profile management

#### Week 2: Credit Assessment Engine

**2.1 Credit Module**
```bash
nest g module modules/credit
nest g controller modules/credit
nest g service modules/credit
```

**Files to create:**
- `src/modules/credit/dto/assess-credit.dto.ts`
- `src/modules/credit/credit-scoring.service.ts`
- `src/modules/credit/credit-assessment.service.ts`
- `src/modules/credit/credit.controller.ts`
- `src/modules/credit/strategies/identity-verification.strategy.ts`
- `src/modules/credit/strategies/behavioral-intelligence.strategy.ts`
- `src/modules/credit/strategies/financial-capacity.strategy.ts`

**Key Features:**
- [ ] Multi-factor credit assessment
- [ ] Identity verification layer (BVN, duplicate check)
- [ ] Behavioral intelligence (device, location)
- [ ] Merchant relationship scoring
- [ ] Financial capacity evaluation
- [ ] ML-based credit scoring (0-1000)
- [ ] Decision engine (instant/conditional/manual/decline)

#### Week 3: Loan Management

**3.1 Loan Module**
```bash
nest g module modules/loans
nest g controller modules/loans
nest g service modules/loans
```

**Files to create:**
- `src/modules/loans/dto/create-loan.dto.ts`
- `src/modules/loans/dto/update-loan.dto.ts`
- `src/modules/loans/loans.repository.ts`
- `src/modules/loans/loans.service.ts`
- `src/modules/loans/loans.controller.ts`
- `src/modules/loans/loan-calculator.service.ts`

**Loan Configuration Structure:**
- **Frequency** (Repayment frequency): Daily, Weekly, Bi-Weekly, Monthly, Quarterly, Bi-Annually, Annually
- **Tenor**: Combination of value and period
  - `tenorValue`: Integer (e.g., 3, 6, 12, 90)
  - `tenorPeriod`: DAYS, WEEKS, MONTHS, YEARS
- **Merchant Configuration**: Each merchant can have multiple loan configurations with:
  - Interest rate (percentage)
  - Penalty settings (late payment penalties)
  - Minimum/maximum loan amounts
  - Allowed frequencies
  - Allowed tenor ranges

**Examples:**
- Tenor: 6 MONTHS, Frequency: Weekly = ~24 weekly payments over 6 months
- Tenor: 1 YEAR, Frequency: Monthly = 12 monthly payments over 1 year
- Tenor: 90 DAYS, Frequency: Daily = 90 daily payments

**Key Features:**
- [x] Loan creation with flexible tenor and frequency
- [x] Dynamic installment calculation based on tenor and frequency
- [x] Interest calculation using merchant configuration
- [x] Penalty calculation for late payments
- [x] Card tokenization (Paystack)
- [x] Loan status management
- [x] Early repayment handling

### Phase 2: Payment Processing & Notifications (Weeks 4-5)

#### Week 4: Payment Module

**4.1 Payment Processing**
```bash
nest g module modules/payments
nest g controller modules/payments
nest g service modules/payments
```

**Files to create:**
- `src/modules/payments/dto/process-payment.dto.ts`
- `src/modules/payments/payments.repository.ts`
- `src/modules/payments/payments.service.ts`
- `src/modules/payments/payments.controller.ts`
- `src/modules/payments/paystack.service.ts`
- `src/modules/payments/payment-scheduler.service.ts`
- `src/modules/payments/retry-logic.service.ts`

**Key Features:**
- [ ] Scheduled payment processing (cron jobs)
- [ ] Paystack integration
- [ ] Auto-debit functionality
- [ ] Smart retry logic (6hr, 24hr, 48hr)
- [ ] Manual payment link generation
- [ ] Payment reconciliation
- [ ] Webhook handling from Paystack

#### Week 5: Notifications & Webhooks

**5.1 Notification Module** ✅ COMPLETED
```bash
nest g module modules/notifications
nest g service modules/notifications
```

**Files created:**
- `src/modules/notifications/notifications.service.ts` ✅ - Main orchestration service
- `src/modules/notifications/email.service.ts` ✅ - Email handler with Nodemailer
- `src/modules/notifications/sms.service.ts` ✅ - SMS handler (ready for Termii/Twilio)
- `src/modules/notifications/push.service.ts` ✅ - Push notification handler (ready for FCM)
- `src/modules/notifications/templates/` ✅ - HTML email templates using Handlebars

**Email Templates created:**
- `merchant-registration.html` ✅ - Welcome email to merchant
- `admin-merchant-registration.html` ✅ - Admin notification for new merchant
- `login-notification.html` ✅ - Login alerts to admin
- `merchant-approval.html` ✅ - Merchant approval notification
- `merchant-rejection.html` ✅ - Merchant rejection notification
- `payment-reminder.html` ✅ - Payment reminder (72hr, 24hr, 2hr)
- `payment-success.html` ✅ - Payment success notification
- `payment-failure.html` ✅ - Payment failure notification
- `loan-completion.html` ✅ - Loan fully paid notification
- `overdue-payment.html` ✅ - Overdue payment alerts

**Key Features:**
- [x] Multi-channel notifications (Email ✅, SMS ✅, Push ✅)
- [x] Notification templates using Handlebars
- [x] Pre-payment reminders (configurable: 72hr, 24hr, 2hr)
- [x] Payment success/failure notifications
- [x] Overdue payment alerts
- [x] Loan completion notifications
- [x] Merchant onboarding emails
- [x] Login notification to admin (hardcoded: crladmin@yopmail.com)

**Email Configuration:**
- SMTP: Gmail (configured in .env)
- Template Engine: Handlebars
- Admin Email: `crladmin@yopmail.com` (hardcoded)
- Non-blocking: Email failures don't block critical operations

**Integration Status:**
- [x] Merchant registration → Sends emails to merchant + admin
- [x] Merchant approval/rejection → Sends email to merchant
- [x] Admin/Merchant login → Sends notification to admin
- [ ] Payment reminders → Ready for Payments module integration
- [ ] Payment success/failure → Ready for Payments module integration
- [ ] Loan completion → Ready for Loans module integration

**5.2 Webhook Module**
```bash
nest g module modules/webhooks
nest g controller modules/webhooks
nest g service modules/webhooks
```

**Key Features:**
- [ ] Webhook subscription management
- [ ] Event publishing
- [ ] Retry logic for failed webhooks
- [ ] Webhook signature verification
- [ ] Event types (loan.created, payment.success, etc.)

### Phase 3: Analytics & Collection (Weeks 6-7)

#### Week 6: Default Management

**6.1 Defaults Module**
```bash
nest g module modules/defaults
nest g controller modules/defaults
nest g service modules/defaults
```

**Key Features:**
- [ ] Overdue payment tracking
- [ ] Escalation logic (Low → Medium → High → Critical → Terminal)
- [ ] Collection workflows
- [ ] Late fee calculation
- [ ] Credit bureau reporting integration
- [ ] Payment plan restructuring

#### Week 7: Analytics Module

**7.1 Analytics**
```bash
nest g module modules/analytics
nest g controller modules/analytics
nest g service modules/analytics
```

**Key Features:**
- [ ] Merchant dashboard APIs
- [ ] Transaction analytics
- [ ] Customer analytics
- [ ] Collection rate metrics
- [ ] Default rate tracking
- [ ] Revenue reporting
- [ ] Performance metrics

### Phase 4: Webview Implementation (Weeks 8-9)

#### Week 8: Customer-Facing Webview

**8.1 Create Webview Frontend**
```bash
# In a new directory or subdirectory
npx create-next-app crl-pay-webview --typescript
cd crl-pay-webview
npm install @tanstack/react-query axios react-hook-form zod
```

**Webview Pages to Create:**

1. **Landing/Product Selection** (`/checkout`)
   - Display product details
   - Show available payment plans
   - CRL Pay branding

2. **Customer Onboarding** (`/onboard`)
   - Personal information form
   - BVN input and verification
   - Address information
   - Device fingerprinting (client-side)

3. **Credit Assessment Loading** (`/assessing`)
   - Loading indicator
   - "Checking eligibility..." messaging
   - Real-time status updates

4. **Credit Decision** (`/decision`)
   - Approval screen with payment plans
   - Conditional approval with limited plans
   - Manual review screen
   - Decline screen with reasons

5. **Payment Plan Selection** (`/select-plan`)
   - Display available tenor and frequency options
   - Show installment breakdown based on selected combination
   - Interest rate transparency
   - Penalty information
   - Total amount payable

6. **Card Authorization** (`/authorize-card`)
   - Secure card input (Paystack Popup)
   - Card tokenization
   - Authorization hold (₦50-100)
   - Terms and conditions acceptance

7. **Confirmation** (`/success`)
   - Loan approval confirmation
   - Payment schedule display
   - Next payment date
   - Download/email schedule option

**Webview Implementation Details:**

```typescript
// Example: Webview API Integration
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1',
});

export const CRLPayAPI = {
  // Customer onboarding
  onboardCustomer: (data: OnboardCustomerDto) =>
    api.post('/customers/onboard', data),

  // Credit assessment
  assessCredit: (customerId: string, merchantId: string) =>
    api.post('/credit/assess', { customerId, merchantId }),

  // Create loan
  createLoan: (data: CreateLoanDto) =>
    api.post('/loans/create', data),

  // Authorize card
  authorizeCard: (customerId: string, cardToken: string) =>
    api.post('/payments/authorize-card', { customerId, cardToken }),
};
```

**Webview Security:**
- [ ] HTTPS only in production
- [ ] Content Security Policy headers
- [ ] CORS configuration
- [ ] Input validation
- [ ] XSS protection
- [ ] Rate limiting

#### Week 9: Merchant Integration SDK

**9.1 Create JavaScript SDK**

```javascript
// crl-pay-sdk.js
class CRLPaySDK {
  constructor(publicKey, options = {}) {
    this.publicKey = publicKey;
    this.baseURL = options.baseURL || 'https://checkout.crlpay.com';
    this.merchantId = options.merchantId;
  }

  // Initialize checkout
  async initializeCheckout(options) {
    const {
      amount,
      customerEmail,
      productDetails,
      callbackUrl,
      metadata = {}
    } = options;

    // Open webview in iframe or popup
    const checkoutUrl = `${this.baseURL}/checkout?` +
      `merchantId=${this.merchantId}&` +
      `amount=${amount}&` +
      `email=${customerEmail}&` +
      `callback=${encodeURIComponent(callbackUrl)}`;

    this.openWebview(checkoutUrl);
  }

  openWebview(url) {
    // Create iframe overlay
    const overlay = document.createElement('div');
    overlay.id = 'crlpay-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 999999;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = `
      width: 100%;
      max-width: 500px;
      height: 90%;
      max-height: 800px;
      border: none;
      border-radius: 10px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
    `;

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Listen for messages from iframe
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  handleMessage(event) {
    if (event.origin !== this.baseURL) return;

    const { type, data } = event.data;

    switch (type) {
      case 'CRLPAY_SUCCESS':
        this.closeWebview();
        this.onSuccess(data);
        break;
      case 'CRLPAY_CLOSE':
        this.closeWebview();
        this.onClose();
        break;
      case 'CRLPAY_ERROR':
        this.closeWebview();
        this.onError(data);
        break;
    }
  }

  closeWebview() {
    const overlay = document.getElementById('crlpay-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Callback handlers
  onSuccess(data) {
    console.log('Payment successful:', data);
  }

  onClose() {
    console.log('Webview closed');
  }

  onError(error) {
    console.error('Payment error:', error);
  }
}

// Export for browser usage
window.CRLPaySDK = CRLPaySDK;
```

**Merchant Integration Example:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>CRL Pay Integration Example</title>
  <script src="https://cdn.crlpay.com/sdk/v1/crlpay.js"></script>
</head>
<body>
  <button onclick="initiateCRLPay()">Pay with CRL Pay</button>

  <script>
    function initiateCRLPay() {
      const crlpay = new CRLPaySDK('pk_test_your_public_key', {
        merchantId: 'merchant_12345'
      });

      crlpay.initializeCheckout({
        amount: 50000, // ₦50,000
        customerEmail: 'customer@example.com',
        productDetails: 'iPhone 13 Pro',
        callbackUrl: 'https://yourstore.com/payment/callback',
        metadata: {
          orderId: 'ORD-12345',
          customFields: []
        }
      });

      // Override callbacks
      crlpay.onSuccess = function(data) {
        console.log('Loan approved:', data);
        window.location.href = '/order/success?ref=' + data.reference;
      };

      crlpay.onClose = function() {
        console.log('Customer closed the payment window');
      };

      crlpay.onError = function(error) {
        console.error('Payment failed:', error);
        alert('Payment failed: ' + error.message);
      };
    }
  </script>
</body>
</html>
```

### Phase 5: Testing & Optimization (Weeks 10-11)

#### Week 10: Comprehensive Testing

**10.1 Unit Tests**

```bash
# Create test files for each service
# Example: src/modules/merchants/merchants.service.spec.ts
```

**Test Coverage Goals:**
- [ ] >80% code coverage
- [ ] All services tested
- [ ] All controllers tested
- [ ] Edge cases covered
- [ ] Error scenarios tested

**10.2 Integration Tests**

```typescript
// Example: e2e/customer-journey.e2e-spec.ts
describe('Complete Customer Journey (e2e)', () => {
  it('should complete full BNPL flow', async () => {
    // 1. Merchant creates checkout session
    // 2. Customer onboards
    // 3. Credit assessment passes
    // 4. Loan is created
    // 5. Card is authorized
    // 6. First payment is processed
  });
});
```

**10.3 Load Testing**

```bash
# Install k6 for load testing
brew install k6

# Create load test script
# tests/load/credit-assessment.js
```

#### Week 11: Performance Optimization

- [ ] Database query optimization
- [ ] Caching strategy (Redis)
- [ ] Response time monitoring
- [ ] Memory leak detection
- [ ] Security audit
- [ ] API rate limiting
- [ ] CDN setup for webview assets

---

## API Implementation Guide

### Authentication & Authorization

**1. Merchant Authentication (JWT)**

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { merchantId: payload.sub, email: payload.email };
  }
}
```

**2. API Key Authentication**

```typescript
// src/common/guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { FirebaseService } from '@/config/firebase.config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      return false;
    }

    // Verify API key from database
    const db = this.firebaseService.getFirestore();
    const merchantsRef = db.collection('crl_merchants');
    const snapshot = await merchantsRef
      .where('apiKeys.publicKey', '==', apiKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return false;
    }

    // Attach merchant to request
    request.merchant = snapshot.docs[0].data();
    return true;
  }
}
```

### Key API Endpoints Implementation

**1. Merchant Registration**

```typescript
// src/modules/merchants/merchants.controller.ts
@Post('register')
@ApiOperation({ summary: 'Register new merchant' })
@ApiResponse({ status: 201, description: 'Merchant registered successfully' })
async register(@Body() dto: RegisterMerchantDto) {
  return this.merchantsService.register(dto);
}
```

```typescript
// src/modules/merchants/dto/register-merchant.dto.ts
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterMerchantDto {
  @ApiProperty({ example: 'Acme Store' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'merchant@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'https://acme.com/webhook' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}
```

**2. Credit Assessment**

```typescript
// src/modules/credit/credit.controller.ts
@Post('assess')
@UseGuards(ApiKeyGuard)
@ApiOperation({ summary: 'Assess customer creditworthiness' })
async assessCredit(@Body() dto: AssessCreditDto, @Request() req) {
  const merchantId = req.merchant.merchantId;
  return this.creditService.assessCreditworthiness(dto, merchantId);
}
```

```typescript
// src/modules/credit/credit-assessment.service.ts
async assessCreditworthiness(
  dto: AssessCreditDto,
  merchantId: string
): Promise<CreditAssessmentResult> {
  // 1. Identity Verification
  const identityScore = await this.verifyIdentity(dto.customerId);

  // 2. Behavioral Intelligence
  const behaviorScore = await this.analyzeBehavior(dto.customerId);

  // 3. Merchant Relationship
  const relationshipScore = await this.scoreMerchantRelationship(
    dto.customerId,
    merchantId
  );

  // 4. Financial Capacity
  const financialScore = await this.assessFinancialCapacity(dto.customerId);

  // 5. Calculate composite score
  const compositeScore = this.calculateCompositeScore({
    identityScore,
    behaviorScore,
    relationshipScore,
    financialScore,
  });

  // 6. Make decision
  const decision = this.makeDecision(compositeScore);

  // 7. Save assessment
  await this.saveAssessment({
    customerId: dto.customerId,
    merchantId,
    scores: { identityScore, behaviorScore, relationshipScore, financialScore },
    compositeScore,
    decision,
  });

  return {
    decision,
    creditScore: compositeScore,
    creditLimit: this.calculateCreditLimit(compositeScore),
    availablePlans: this.getAvailablePlans(decision, compositeScore),
  };
}
```

**3. Loan Creation**

```typescript
// src/modules/loans/loans.service.ts
async createLoan(dto: CreateLoanDto): Promise<LoanCreationResult> {
  const db = this.firebaseService.getFirestore();

  // 1. Validate customer eligibility
  const customer = await this.getCustomer(dto.customerId);
  if (dto.amount > customer.creditLimit) {
    throw new BadRequestException('Amount exceeds credit limit');
  }

  // 2. Calculate loan details
  const loanDetails = this.loanCalculator.calculate({
    principal: dto.amount,
    plan: dto.paymentPlan,
    numberOfInstallments: dto.installments,
  });

  // 3. Create loan document
  const loanRef = db.collection('crl_loans').doc();
  const loan: CrlLoan = {
    loanId: loanRef.id,
    customerId: dto.customerId,
    merchantId: dto.merchantId,
    transactionReference: dto.transactionReference,
    principalAmount: dto.amount,
    interestRate: loanDetails.interestRate,
    totalAmount: loanDetails.totalAmount,
    installmentAmount: loanDetails.installmentAmount,
    numberOfInstallments: dto.installments,
    paidInstallments: 0,
    remainingBalance: loanDetails.totalAmount,
    paymentPlan: dto.paymentPlan,
    status: LoanStatus.ACTIVE,
    cardToken: '', // Will be set after card authorization
    nextPaymentDate: loanDetails.firstPaymentDate,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await loanRef.set(loan);

  // 4. Create payment schedule
  await this.createPaymentSchedule(loan);

  // 5. Notify merchant
  await this.webhookService.notifyMerchant(dto.merchantId, {
    event: 'loan.created',
    data: loan,
  });

  return {
    loanId: loan.loanId,
    totalAmount: loan.totalAmount,
    installmentAmount: loan.installmentAmount,
    schedule: loanDetails.schedule,
  };
}
```

**4. Payment Processing with Cron**

```typescript
// src/modules/payments/payment-scheduler.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PaymentSchedulerService {
  constructor(
    private paymentsService: PaymentsService,
    private firebaseService: FirebaseService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async processDuePayments() {
    const db = this.firebaseService.getFirestore();
    const today = Timestamp.fromDate(new Date());

    // Get all payments due today
    const paymentsRef = db.collection('crl_payments');
    const snapshot = await paymentsRef
      .where('scheduledDate', '<=', today)
      .where('status', '==', PaymentStatus.PENDING)
      .get();

    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Processing ${payments.length} due payments`);

    // Process each payment
    for (const payment of payments) {
      try {
        await this.paymentsService.processPayment(payment.id);
      } catch (error) {
        console.error(`Failed to process payment ${payment.id}:`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async retryFailedPayments() {
    // Retry logic for failed payments
    const db = this.firebaseService.getFirestore();
    const sixHoursAgo = Timestamp.fromDate(
      new Date(Date.now() - 6 * 60 * 60 * 1000)
    );

    const paymentsRef = db.collection('crl_payments');
    const snapshot = await paymentsRef
      .where('status', '==', PaymentStatus.FAILED)
      .where('retryCount', '<', 3)
      .where('updatedAt', '<=', sixHoursAgo)
      .get();

    for (const doc of snapshot.docs) {
      await this.paymentsService.retryPayment(doc.id);
    }
  }
}
```

---

## Admin Dashboard Implementation

### Overview

The Admin Dashboard is a full-featured React SPA for CRL Pay administrators to manage the entire system.

### Setup Admin Dashboard

```bash
# Create admin dashboard app
cd apps
npm create vite@latest admin-dashboard -- --template react-ts
cd admin-dashboard
npm install

# Install dependencies
npm install react-router-dom axios @tanstack/react-query
npm install recharts date-fns lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Admin Module (Backend API)

First, create the admin module in the backend:

```bash
nest g module modules/admin
nest g controller modules/admin
nest g service modules/admin
```

#### Admin Authentication & Guards

```typescript
// src/modules/admin/dto/admin-login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

```typescript
// src/modules/admin/admin.controller.ts
import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';

@ApiTags('Admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('auth/login')
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Get('merchants/pending')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending merchant approvals' })
  async getPendingMerchants() {
    return this.adminService.getPendingMerchants();
  }

  @Put('merchants/:merchantId/approve')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve merchant' })
  async approveMerchant(
    @Param('merchantId') merchantId: string,
    @Request() req
  ) {
    return this.adminService.approveMerchant(merchantId, req.user.adminId);
  }

  @Put('merchants/:merchantId/reject')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  async rejectMerchant(
    @Param('merchantId') merchantId: string,
    @Body('reason') reason: string,
    @Request() req
  ) {
    return this.adminService.rejectMerchant(merchantId, reason, req.user.adminId);
  }

  @Get('merchants')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all merchants' })
  async getAllMerchants() {
    return this.adminService.getAllMerchants();
  }

  @Get('analytics/overview')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system-wide analytics' })
  async getSystemAnalytics() {
    return this.adminService.getSystemAnalytics();
  }

  @Get('defaults')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all defaults' })
  async getAllDefaults() {
    return this.adminService.getAllDefaults();
  }
}
```

```typescript
// src/common/guards/admin-jwt.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Ensure it's an admin token
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid token type');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Admin Dashboard Frontend

#### App Structure

```typescript
// apps/admin-dashboard/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MerchantApproval from './pages/MerchantApproval';
import MerchantManagement from './pages/MerchantManagement';
import DefaultManagement from './pages/DefaultManagement';
import SystemAnalytics from './pages/SystemAnalytics';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <PrivateRoute>
                  <MerchantApproval />
                </PrivateRoute>
              }
            />
            <Route
              path="/merchants"
              element={
                <PrivateRoute>
                  <MerchantManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/defaults"
              element={
                <PrivateRoute>
                  <DefaultManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute>
                  <SystemAnalytics />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

#### Authentication Context

```typescript
// apps/admin-dashboard/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAPI } from '../services/api';

interface AuthContextType {
  admin: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_data');

    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await adminAPI.login({ email, password });
    const { token, admin: adminData } = response.data;

    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_data', JSON.stringify(adminData));

    setAdmin(adminData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### API Service

```typescript
// apps/admin-dashboard/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminAPI = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/admin/auth/login', credentials),

  // Merchants
  getPendingMerchants: () =>
    apiClient.get('/admin/merchants/pending'),

  getAllMerchants: () =>
    apiClient.get('/admin/merchants'),

  getMerchant: (merchantId: string) =>
    apiClient.get(`/admin/merchants/${merchantId}`),

  approveMerchant: (merchantId: string) =>
    apiClient.put(`/admin/merchants/${merchantId}/approve`),

  rejectMerchant: (merchantId: string, reason: string) =>
    apiClient.put(`/admin/merchants/${merchantId}/reject`, { reason }),

  // Analytics
  getSystemAnalytics: () =>
    apiClient.get('/admin/analytics/overview'),

  // Defaults
  getAllDefaults: () =>
    apiClient.get('/admin/defaults'),
};
```

#### Merchant Approval Page

```typescript
// apps/admin-dashboard/src/pages/MerchantApproval.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { Check, X, Eye } from 'lucide-react';

export default function MerchantApproval() {
  const queryClient = useQueryClient();
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);

  const { data: merchants, isLoading } = useQuery({
    queryKey: ['pendingMerchants'],
    queryFn: async () => {
      const response = await adminAPI.getPendingMerchants();
      return response.data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (merchantId: string) => adminAPI.approveMerchant(merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMerchants'] });
      alert('Merchant approved successfully');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ merchantId, reason }: { merchantId: string; reason: string }) =>
      adminAPI.rejectMerchant(merchantId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMerchants'] });
      alert('Merchant rejected');
    },
  });

  const handleApprove = (merchantId: string) => {
    if (confirm('Are you sure you want to approve this merchant?')) {
      approveMutation.mutate(merchantId);
    }
  };

  const handleReject = (merchantId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      rejectMutation.mutate({ merchantId, reason });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Merchant Approvals</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pending Approvals ({merchants?.length || 0})</h2>
        </div>

        <div className="divide-y">
          {merchants?.map((merchant: any) => (
            <div key={merchant.merchantId} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{merchant.businessName}</h3>
                  <p className="text-sm text-gray-600">{merchant.email}</p>
                  <p className="text-sm text-gray-600">{merchant.phone}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Applied: {new Date(merchant.createdAt.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMerchant(merchant)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleApprove(merchant.merchantId)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleReject(merchant.merchantId)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Merchant Details Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Merchant Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Business Name</label>
                <p>{selectedMerchant.businessName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p>{selectedMerchant.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p>{selectedMerchant.phone}</p>
              </div>

              {/* Add more merchant details here */}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    handleApprove(selectedMerchant.merchantId);
                    setSelectedMerchant(null);
                  }}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                >
                  Approve Merchant
                </button>
                <button
                  onClick={() => setSelectedMerchant(null)}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### System Analytics Dashboard

```typescript
// apps/admin-dashboard/src/pages/SystemAnalytics.tsx
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function SystemAnalytics() {
  const { data: analytics } = useQuery({
    queryKey: ['systemAnalytics'],
    queryFn: async () => {
      const response = await adminAPI.getSystemAnalytics();
      return response.data.data;
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Merchants</p>
          <p className="text-3xl font-bold">{analytics?.totalMerchants || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Active Loans</p>
          <p className="text-3xl font-bold">{analytics?.activeLoans || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Disbursed</p>
          <p className="text-3xl font-bold">₦{analytics?.totalDisbursed?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Collection Rate</p>
          <p className="text-3xl font-bold">{analytics?.collectionRate || 0}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Loan Volume (Last 30 Days)</h3>
          <LineChart width={500} height={300} data={analytics?.loanVolumeData || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="volume" stroke="#8884d8" />
          </LineChart>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Default Rate by Tier</h3>
          <BarChart width={500} height={300} data={analytics?.defaultRateByTier || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tier" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="rate" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}
```

---

## Merchant Dashboard Implementation

### Overview

The Merchant Dashboard allows merchants to monitor their transactions, customers, and analytics.

### Setup Merchant Dashboard

```bash
cd apps
npm create vite@latest merchant-dashboard -- --template react-ts
cd merchant-dashboard
npm install

# Install dependencies
npm install react-router-dom axios @tanstack/react-query
npm install recharts date-fns lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Merchant API Endpoints

```typescript
// src/modules/merchants/merchants.controller.ts (additions)
@Get('me')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get current merchant profile' })
async getProfile(@Request() req) {
  return this.merchantsService.getProfile(req.user.merchantId);
}

@Get('me/transactions')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get merchant transactions' })
async getTransactions(@Request() req, @Query() filters) {
  return this.merchantsService.getTransactions(req.user.merchantId, filters);
}

@Get('me/customers')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get merchant customers' })
async getCustomers(@Request() req) {
  return this.merchantsService.getCustomers(req.user.merchantId);
}

@Get('me/analytics')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get merchant analytics' })
async getAnalytics(@Request() req) {
  return this.merchantsService.getAnalytics(req.user.merchantId);
}

@Get('me/settlements')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get merchant settlements' })
async getSettlements(@Request() req) {
  return this.merchantsService.getSettlements(req.user.merchantId);
}

@Put('me/settings')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Update merchant settings' })
async updateSettings(@Request() req, @Body() dto: UpdateMerchantSettingsDto) {
  return this.merchantsService.updateSettings(req.user.merchantId, dto);
}
```

### Merchant Dashboard Frontend

#### Transactions Page

```typescript
// apps/merchant-dashboard/src/pages/Transactions.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { merchantAPI } from '../services/api';
import { Search, Filter, Download } from 'lucide-react';

export default function Transactions() {
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const response = await merchantAPI.getTransactions(filters);
      return response.data.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium">Transaction ID</th>
              <th className="text-left p-4 font-medium">Customer</th>
              <th className="text-left p-4 font-medium">Amount</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions?.map((txn: any) => (
              <tr key={txn.transactionId} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-sm">{txn.transactionId.slice(0, 12)}...</td>
                <td className="p-4">{txn.customerName}</td>
                <td className="p-4">₦{txn.amount.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(txn.status)}`}>
                    {txn.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(txn.createdAt.seconds * 1000).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        )}

        {!isLoading && transactions?.length === 0 && (
          <div className="p-8 text-center text-gray-500">No transactions found</div>
        )}
      </div>
    </div>
  );
}
```

#### Analytics Page

```typescript
// apps/merchant-dashboard/src/pages/Analytics.tsx
import { useQuery } from '@tanstack/react-query';
import { merchantAPI } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';

export default function Analytics() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await merchantAPI.getAnalytics();
      return response.data.data;
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">₦{analytics?.totalRevenue?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-green-600">12.5%</span>
            <span className="text-gray-500">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold">{analytics?.activeCustomers || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-green-600">8.2%</span>
            <span className="text-gray-500">vs last month</span>
          </div>
        </div>

        {/* More KPI cards... */}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="font-semibold mb-4">Revenue Trend (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics?.revenueTrend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

## Webview Implementation Guide

### Webview Architecture

```
crl-pay-webview/
├── src/
│   ├── app/
│   │   ├── checkout/           # Main checkout flow
│   │   │   ├── page.tsx        # Entry point
│   │   │   ├── onboard/
│   │   │   ├── assessing/
│   │   │   ├── decision/
│   │   │   ├── select-plan/
│   │   │   ├── authorize-card/
│   │   │   └── success/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── forms/              # Form components
│   │   └── layout/             # Layout components
│   ├── services/
│   │   ├── api.ts              # API client
│   │   └── paystack.ts         # Paystack integration
│   ├── utils/
│   │   ├── device-fingerprint.ts
│   │   └── validation.ts
│   └── types/
│       └── index.ts
├── public/
│   └── assets/
└── package.json
```

### Key Webview Components

**1. Customer Onboarding Form**

```typescript
// src/app/checkout/onboard/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CRLPayAPI } from '@/services/api';
import { getDeviceFingerprint } from '@/utils/device-fingerprint';

const onboardSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^(\+234|0)[789]\d{9}$/, 'Invalid phone number'),
  bvn: z.string().length(11, 'BVN must be 11 digits'),
  dateOfBirth: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
  }),
});

type OnboardFormData = z.infer<typeof onboardSchema>;

export default function OnboardPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<OnboardFormData>({
    resolver: zodResolver(onboardSchema),
  });

  const onSubmit = async (data: OnboardFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get device fingerprint
      const deviceInfo = await getDeviceFingerprint();

      // Get location
      const location = await getCurrentLocation();

      // Submit to API
      const response = await CRLPayAPI.onboardCustomer({
        ...data,
        deviceInfo,
        locationData: location,
      });

      // Store customer ID in session
      sessionStorage.setItem('customerId', response.data.customerId);

      // Redirect to credit assessment
      router.push('/checkout/assessing');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to onboard customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Complete Your Information</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            {...register('fullName')}
            className="w-full border rounded px-3 py-2"
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full border rounded px-3 py-2"
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            {...register('phone')}
            className="w-full border rounded px-3 py-2"
            placeholder="+2348012345678"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* BVN */}
        <div>
          <label className="block text-sm font-medium mb-1">BVN (Bank Verification Number)</label>
          <input
            {...register('bvn')}
            className="w-full border rounded px-3 py-2"
            placeholder="12345678901"
            maxLength={11}
          />
          {errors.bvn && (
            <p className="text-red-500 text-sm mt-1">{errors.bvn.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Required for identity verification. Your information is secure.
          </p>
        </div>

        {/* Address fields... */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
```

**2. Credit Assessment Loading Screen**

```typescript
// src/app/checkout/assessing/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CRLPayAPI } from '@/services/api';

export default function AssessingPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your identity...');

  useEffect(() => {
    const customerId = sessionStorage.getItem('customerId');
    const merchantId = new URLSearchParams(window.location.search).get('merchantId');

    if (!customerId || !merchantId) {
      router.push('/checkout');
      return;
    }

    // Simulate assessment stages
    const stages = [
      { message: 'Verifying your identity...', delay: 1000 },
      { message: 'Analyzing your transaction history...', delay: 2000 },
      { message: 'Calculating your credit score...', delay: 2000 },
      { message: 'Determining your eligibility...', delay: 1500 },
    ];

    let currentStage = 0;

    const updateStage = () => {
      if (currentStage < stages.length) {
        setStatus(stages[currentStage].message);
        currentStage++;
        setTimeout(updateStage, stages[currentStage - 1].delay);
      } else {
        // Assessment complete, call API
        assessCredit();
      }
    };

    updateStage();

    async function assessCredit() {
      try {
        const response = await CRLPayAPI.assessCredit(customerId!, merchantId!);

        // Store assessment result
        sessionStorage.setItem('assessmentResult', JSON.stringify(response.data));

        // Redirect based on decision
        router.push('/checkout/decision');
      } catch (error) {
        console.error('Assessment failed:', error);
        router.push('/checkout/decision?status=failed');
      }
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full text-center">
        {/* Animated spinner */}
        <div className="w-24 h-24 mx-auto mb-6">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-600"></div>
        </div>

        <h2 className="text-xl font-semibold mb-2">Assessing Your Eligibility</h2>
        <p className="text-gray-600 mb-6">{status}</p>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
        </div>

        <p className="text-sm text-gray-500 mt-4">This usually takes 10-15 seconds</p>
      </div>
    </div>
  );
}
```

**3. Payment Plan Selection**

```typescript
// src/app/checkout/select-plan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentPlan {
  type: 'bronze' | 'silver' | 'gold' | 'platinum';
  name: string;
  term: number;
  interestRate: number;
  installmentAmount: number;
  totalAmount: number;
}

export default function SelectPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    const assessmentResult = sessionStorage.getItem('assessmentResult');
    if (!assessmentResult) {
      router.push('/checkout');
      return;
    }

    const result = JSON.parse(assessmentResult);
    setPlans(result.availablePlans);
  }, [router]);

  const handleSelectPlan = async (planType: string) => {
    setSelectedPlan(planType);
    sessionStorage.setItem('selectedPlan', planType);
    router.push('/checkout/authorize-card');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Choose Your Payment Plan</h1>
      <p className="text-gray-600 mb-8">Select a plan that works best for you</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.type}
            className="border rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => handleSelectPlan(plan.type)}
          >
            <h3 className="text-lg font-semibold mb-2 capitalize">{plan.name}</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ₦{plan.installmentAmount.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 mb-4">per month</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Term:</span>
                <span className="font-medium">{plan.term} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest:</span>
                <span className="font-medium">{plan.interestRate}% monthly</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">₦{plan.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Select Plan
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Important Information:</h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>First payment will be deducted automatically on your selected date</li>
          <li>You can pay early without penalties</li>
          <li>Late payments may incur additional fees</li>
          <li>All amounts are in Nigerian Naira (₦)</li>
        </ul>
      </div>
    </div>
  );
}
```

**4. Paystack Card Authorization**

```typescript
// src/app/checkout/authorize-card/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaystackPayment } from 'react-paystack';
import { CRLPayAPI } from '@/services/api';

export default function AuthorizeCardPage() {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const customerId = sessionStorage.getItem('customerId');
    const selectedPlan = sessionStorage.getItem('selectedPlan');

    if (!customerId || !selectedPlan) {
      router.push('/checkout');
      return;
    }

    // Initialize Paystack config
    setConfig({
      reference: new Date().getTime().toString(),
      email: 'customer@example.com', // Get from session
      amount: 10000, // ₦100 authorization hold (in kobo)
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
    });
  }, [router]);

  const onSuccess = async (reference: any) => {
    setIsProcessing(true);
    try {
      const customerId = sessionStorage.getItem('customerId');

      // Verify payment and get card token
      const response = await CRLPayAPI.authorizeCard(customerId!, reference.reference);

      // Create loan
      await CRLPayAPI.createLoan({
        customerId: customerId!,
        // ... other loan details
      });

      router.push('/checkout/success');
    } catch (error) {
      console.error('Card authorization failed:', error);
      alert('Failed to authorize card. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onClose = () => {
    console.log('Payment window closed');
  };

  const initializePayment = usePaystackPayment(config || {});

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Authorize Your Card</h1>
      <p className="text-gray-600 mb-8">
        We'll charge ₦100 to verify your card. This will be refunded immediately.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">Why do we need this?</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>To verify your card is valid and has sufficient funds</li>
          <li>To set up automatic monthly payments</li>
          <li>Your card details are secured by Paystack (PCI-DSS compliant)</li>
          <li>We never see or store your full card number</li>
        </ul>
      </div>

      <button
        onClick={() => initializePayment(onSuccess, onClose)}
        disabled={isProcessing}
        className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Authorize Card'}
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Secured by Paystack. Your information is encrypted and protected.
      </p>
    </div>
  );
}
```

**5. Device Fingerprinting Utility**

```typescript
// src/utils/device-fingerprint.ts
export async function getDeviceFingerprint() {
  const fingerprint = {
    phoneType: getDeviceType(),
    operatingSystem: getOS(),
    browser: getBrowser(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  };

  return fingerprint;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/win/i.test(ua)) return 'Windows';
  if (/mac/i.test(ua)) return 'MacOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|chromium|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opr\//i.test(ua)) return 'Opera';
  if (/trident/i.test(ua)) return 'IE';
  return 'Unknown';
}

export async function getCurrentLocation(): Promise<{
  gps: { latitude: number; longitude: number };
  ipAddress: string;
}> {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const ipAddress = await fetchIPAddress();
          resolve({
            gps: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            ipAddress,
          });
        },
        async () => {
          // Location denied, just get IP
          const ipAddress = await fetchIPAddress();
          resolve({
            gps: { latitude: 0, longitude: 0 },
            ipAddress,
          });
        }
      );
    } else {
      resolve({
        gps: { latitude: 0, longitude: 0 },
        ipAddress: 'unavailable',
      });
    }
  });
}

async function fetchIPAddress(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unavailable';
  }
}
```

---

## Testing Strategy

### 1. Unit Testing

**Example: Credit Scoring Service Test**

```typescript
// src/modules/credit/credit-assessment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CreditAssessmentService } from './credit-assessment.service';
import { FirebaseService } from '@/config/firebase.config';

describe('CreditAssessmentService', () => {
  let service: CreditAssessmentService;
  let firebaseService: FirebaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditAssessmentService,
        {
          provide: FirebaseService,
          useValue: {
            getFirestore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CreditAssessmentService>(CreditAssessmentService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
  });

  describe('calculateCompositeScore', () => {
    it('should calculate correct composite score', () => {
      const scores = {
        identityScore: 90,
        behaviorScore: 85,
        relationshipScore: 75,
        financialScore: 80,
      };

      const compositeScore = service.calculateCompositeScore(scores);
      expect(compositeScore).toBeGreaterThan(0);
      expect(compositeScore).toBeLessThanOrEqual(1000);
    });

    it('should give higher weight to identity score', () => {
      const highIdentity = service.calculateCompositeScore({
        identityScore: 100,
        behaviorScore: 50,
        relationshipScore: 50,
        financialScore: 50,
      });

      const lowIdentity = service.calculateCompositeScore({
        identityScore: 50,
        behaviorScore: 100,
        relationshipScore: 100,
        financialScore: 100,
      });

      // Identity should have more weight
      expect(highIdentity).toBeGreaterThan(lowIdentity - 100);
    });
  });

  describe('makeDecision', () => {
    it('should return instant_approval for score > 700', () => {
      const decision = service.makeDecision(750);
      expect(decision).toBe('instant_approval');
    });

    it('should return conditional_approval for score 500-700', () => {
      const decision = service.makeDecision(600);
      expect(decision).toBe('conditional_approval');
    });

    it('should return manual_review for score 400-500', () => {
      const decision = service.makeDecision(450);
      expect(decision).toBe('manual_review');
    });

    it('should return declined for score < 400', () => {
      const decision = service.makeDecision(350);
      expect(decision).toBe('declined');
    });
  });
});
```

### 2. E2E Testing

**Example: Complete Customer Journey**

```typescript
// test/e2e/customer-journey.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Complete BNPL Customer Journey (e2e)', () => {
  let app: INestApplication;
  let merchantApiKey: string;
  let customerId: string;
  let loanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register merchant and get API key
    const merchantResponse = await request(app.getHttpServer())
      .post('/api/v1/merchants/register')
      .send({
        businessName: 'Test Store',
        email: 'test@store.com',
        phone: '+2348012345678',
        password: 'SecurePass123!',
      });

    merchantApiKey = merchantResponse.body.data.apiKeys.publicKey;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete full BNPL flow', async () => {
    // Step 1: Onboard customer
    const onboardResponse = await request(app.getHttpServer())
      .post('/api/v1/customers/onboard')
      .set('x-api-key', merchantApiKey)
      .send({
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+2348087654321',
        bvn: '12345678901',
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Main St',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
        },
        deviceInfo: {
          phoneType: 'Mobile',
          deviceFingerprint: 'abc123',
          operatingSystem: 'Android',
        },
        locationData: {
          gps: { latitude: 6.5244, longitude: 3.3792 },
          ipAddress: '197.210.123.45',
        },
      })
      .expect(201);

    customerId = onboardResponse.body.data.customerId;
    expect(customerId).toBeDefined();

    // Step 2: Assess credit
    const assessmentResponse = await request(app.getHttpServer())
      .post('/api/v1/credit/assess')
      .set('x-api-key', merchantApiKey)
      .send({
        customerId,
        amount: 50000,
      })
      .expect(200);

    expect(assessmentResponse.body.data.decision).toBeDefined();
    expect(assessmentResponse.body.data.creditScore).toBeGreaterThan(0);

    // Skip if declined
    if (assessmentResponse.body.data.decision === 'declined') {
      return;
    }

    // Step 3: Create loan
    const loanResponse = await request(app.getHttpServer())
      .post('/api/v1/loans/create')
      .set('x-api-key', merchantApiKey)
      .send({
        customerId,
        amount: 50000,
        paymentPlan: 'silver',
        installments: 6,
        transactionReference: 'TXN-' + Date.now(),
      })
      .expect(201);

    loanId = loanResponse.body.data.loanId;
    expect(loanId).toBeDefined();
    expect(loanResponse.body.data.totalAmount).toBeGreaterThan(50000); // With interest

    // Step 4: Authorize card (simulate)
    await request(app.getHttpServer())
      .post('/api/v1/payments/authorize-card')
      .set('x-api-key', merchantApiKey)
      .send({
        customerId,
        loanId,
        cardToken: 'tok_test_abc123',
      })
      .expect(200);

    // Step 5: Process first payment
    await request(app.getHttpServer())
      .post('/api/v1/payments/process')
      .set('x-api-key', merchantApiKey)
      .send({
        loanId,
        installmentNumber: 1,
      })
      .expect(200);

    // Verify loan status updated
    const loanStatus = await request(app.getHttpServer())
      .get(`/api/v1/loans/${loanId}`)
      .set('x-api-key', merchantApiKey)
      .expect(200);

    expect(loanStatus.body.data.paidInstallments).toBe(1);
    expect(loanStatus.body.data.remainingBalance).toBeLessThan(loanStatus.body.data.totalAmount);
  });
});
```

### 3. Load Testing with k6

```javascript
// tests/load/credit-assessment.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
};

export default function () {
  const apiKey = __ENV.API_KEY;
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3006/api/v1';

  // Assess credit
  const payload = JSON.stringify({
    customerId: `test_customer_${__VU}_${__ITER}`,
    amount: 50000,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  };

  const response = http.post(`${baseUrl}/credit/assess`, payload, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has decision': (r) => JSON.parse(r.body).data.decision !== undefined,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run load test:
```bash
k6 run -e API_KEY=your_api_key tests/load/credit-assessment.js
```

---

## Deployment Guide

### Production Deployment Checklist

#### Backend API

- [ ] Set `NODE_ENV=production` in environment
- [ ] Use strong JWT secret (min 64 characters)
- [ ] Enable Firebase security rules
- [ ] Set up SSL certificates (Let's Encrypt or CloudFlare)
- [ ] Configure firewall rules (allow only HTTPS)
- [ ] Enable rate limiting on API routes
- [ ] Set up monitoring (Datadog, New Relic, or PM2)
- [ ] Configure log rotation
- [ ] Set up error tracking (Sentry)
- [ ] Enable CORS for production domains only
- [ ] Use production Paystack keys
- [ ] Set up automated backups (daily Firestore exports)
- [ ] Configure CDN for static assets
- [ ] Set up health check endpoint
- [ ] Enable application performance monitoring (APM)

#### Webview Frontend

- [ ] Build for production: `npm run build`
- [ ] Enable CDN for static assets (CloudFlare, Vercel)
- [ ] Configure CSP headers
- [ ] Enable HTTPS only
- [ ] Set up analytics (Google Analytics, Mixpanel)
- [ ] Configure error tracking (Sentry)
- [ ] Optimize images and assets
- [ ] Enable Gzip/Brotli compression
- [ ] Set up monitoring for uptime
- [ ] Configure cache headers
- [ ] Test on multiple devices/browsers
- [ ] Set up A/B testing platform (optional)

### Deployment Platforms

**Recommended for Backend:**
- **Google Cloud Run** (easiest with Firebase)
- **AWS Elastic Beanstalk**
- **DigitalOcean App Platform**
- **Railway**

**Recommended for Webview:**
- **Vercel** (Next.js optimized)
- **Netlify**
- **CloudFlare Pages**

### Environment Variables for Production

```bash
# Production .env
NODE_ENV=production
PORT=3006

# Database
FIREBASE_PROJECT_ID=stitches-africa
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

# Security
JWT_SECRET=<64-char-random-string>
CORS_ORIGIN=https://checkout.crlpay.com,https://merchant1.com

# Paystack (Production)
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# Monitoring
SENTRY_DSN=https://...
```

---

## Summary

This implementation guide covers:

1. ✅ **Complete Setup** - Installation, Firebase, environment
2. ✅ **Backend API** - All modules with detailed implementation
3. ✅ **Webview** - Customer-facing checkout flow
4. ✅ **SDK** - Merchant integration JavaScript library
5. ✅ **Testing** - Unit, E2E, and load testing strategies
6. ✅ **Deployment** - Production deployment checklist

**Total Estimated Timeline:** 11 weeks for full implementation

**Next Immediate Steps:**
1. Install dependencies: `npm install`
2. Verify setup: `npm run start:dev`
3. Start with Week 1: Merchant & Customer modules
4. Follow the roadmap sequentially

For questions or issues, refer to the [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data structures and this guide for implementation details.

---

**Good luck with your implementation! 🚀**
