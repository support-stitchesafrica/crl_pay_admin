# CRL Pay Webview - Implementation Notes

## Recent Updates (2025-12-30)

### 1. Fixed Issues

#### ✅ Merchant Mapping
- **Issue**: Customers were not properly mapped to merchants
- **Fix**: Updated `customers.service.ts` to conditionally spread optional fields instead of assigning undefined values
- **Location**: [src/modules/customers/customers.service.ts:79-80](../../src/modules/customers/customers.service.ts#L79-L80)
- **Result**: Customers are now properly linked to merchants via the `registeredVia` field

#### ✅ Text Visibility
- **Issue**: Input text was not clearly visible when typing
- **Fix**: Added `text-gray-900` class to all input fields for black text
- **Location**: [apps/customer-webview/src/app/checkout/page.tsx](src/app/checkout/page.tsx)

#### ✅ Form Validation
- **Issue**: Sticky footer button needed proper form validation
- **Fix**: Used HTML5 `form` attribute to link button to form element
- **Location**: [apps/customer-webview/src/app/checkout/page.tsx:377-380](src/app/checkout/page.tsx#L377-L380)

### 2. New Features

#### 🎯 Repayment Schedule Display
- Added interactive repayment schedule modal
- Shows breakdown of all payments with due dates
- Displays interest calculation and total amount
- User must review schedule before confirming plan

**Implementation**:
- Interface: `RepaymentScheduleItem` with installment number, due date, and amount
- Calculation function: `calculateRepaymentSchedule()` - computes payment dates based on frequency
- Modal UI: Full-screen overlay with scrollable schedule
- Location: [apps/customer-webview/src/app/checkout/page.tsx:486-557](src/app/checkout/page.tsx#L486-L557)

#### 💳 Paystack Integration
- Integrated Paystack for card authorization
- Opens Paystack checkout in popup window
- Polls for transaction completion
- Verifies authorization before proceeding

**Flow**:
1. Initialize Paystack transaction via backend API
2. Open authorization URL in popup window
3. Poll for window closure
4. Verify transaction status
5. Extract authorization code for recurring payments

**Location**: [apps/customer-webview/src/app/checkout/page.tsx:219-306](src/app/checkout/page.tsx#L219-L306)

#### 📱 Real Implementation Demo
- Created `demo-real.html` for testing with actual merchant data
- Uses real merchant ID: `mzPmbALb7FOktvhn8Frh` (Stitches Africa)
- Product: Premium Designer Dress - ₦45,000
- Full integration with CRL Pay SDK

**Access**:
- Development: `http://localhost:3010/demo-real.html`
- Test with real merchant configuration
- Location: [apps/customer-webview/public/demo-real.html](public/demo-real.html)

### 3. UI Improvements

#### Fixed Header & Sticky Button
- Header stays fixed at top (doesn't scroll)
- Content area scrolls independently
- Continue button sticky at bottom
- Consistent across customer-info and card-authorization steps

**Layout Structure**:
```
┌─────────────────────────┐
│  Fixed Header (blue)    │ ← flex-shrink-0
├─────────────────────────┤
│  Scrollable Content     │ ← flex-1 overflow-y-auto
├─────────────────────────┤
│  Sticky Button Footer   │ ← flex-shrink-0
└─────────────────────────┘
```

### 4. Payment Plan Configuration

Current implementation uses hardcoded plans with the following rates:
- **30 Days**: 2.5% interest, 4 weekly payments
- **60 Days**: 5% interest, 4 bi-weekly payments
- **90 Days**: 7.5% interest, 3 monthly payments

**Note**: In production, these should be fetched from merchant configuration in the backend.

### 5. Testing Instructions

#### Test with Demo (Simulated)
```bash
# Start webview
npm run dev:webview

# Open demo
http://localhost:3010/demo.html
```

#### Test with Real Merchant Data
```bash
# Ensure backend is running
npm run dev

# Open real demo
http://localhost:3010/demo-real.html
```

**Test Flow**:
1. Click "Buy Now, Pay Later"
2. Fill customer information (all fields required)
3. Select payment plan
4. Review repayment schedule
5. Confirm plan (triggers credit check)
6. Authorize card via Paystack popup
7. Complete checkout

### 6. API Integration Points

#### Customer Registration
- **Endpoint**: `POST /api/v1/customers`
- **Payload**: Customer data + merchantId
- **Response**: Customer object with ID

#### Payment Initialization (TODO)
- **Endpoint**: `POST /api/v1/payments/initialize-authorization`
- **Payload**: Email, amount, merchantId, customerId
- **Response**: Paystack authorization URL

#### Payment Verification (TODO)
- **Endpoint**: `GET /api/v1/payments/verify/:reference`
- **Response**: Transaction status and authorization code

### 7. Complete Checkout Flow (2025-12-30)

#### Flow Implementation
The complete checkout flow is now implemented with the following steps:

1. **Email Check**: When webview loads, check if customer email already exists
   - If exists: Skip registration form → Credit assessment
   - If new: Show registration form

2. **Customer Registration** (if new customer)
   - Collect customer information
   - Create customer record via API
   - Proceed to credit assessment

3. **Credit Assessment**
   - Call credit scoring API: `POST /api/v1/credit/assess`
   - If approved: Generate payment plans → Show plan selection
   - If denied: Show error message and stop

4. **Payment Plan Selection**
   - Display available payment plans
   - Show repayment schedule when plan selected
   - User confirms plan to proceed

5. **Card Authorization**
   - Initialize Paystack transaction
   - Open Paystack popup for card authorization
   - Poll for completion and verify

6. **Loan Creation & Disbursement**
   - Create loan record: `POST /api/v1/loans/create`
   - Disburse funds to merchant: `POST /api/v1/disbursements/process`

7. **Success & Auto-Close**
   - Show success page with transaction details
   - Send comprehensive callback to parent with all data
   - Auto-close after 5 seconds

#### Success Callback Data
```javascript
{
  loanId: string,
  customerId: string,
  merchantId: string,
  amount: number,
  plan: PaymentPlan,
  repaymentSchedule: RepaymentScheduleItem[],
  authorizationCode: string,
  reference: string,
  disbursement: object,
  customer: CustomerData,
  creditScore: number
}
```

### 8. Known Limitations & Next Steps

#### Backend Endpoints Status

✅ **Implemented:**
1. `GET /api/v1/customers/by-email/:email` - Check existing customer (requires API key)

❌ **Need Implementation:**
2. `POST /api/v1/credit/assess` - Credit assessment
3. `POST /api/v1/payments/initialize-authorization` - Initialize Paystack
4. `GET /api/v1/payments/verify/:reference` - Verify Paystack transaction
5. `POST /api/v1/loans/create` - Create loan record
6. `POST /api/v1/disbursements/process` - Disburse to merchant

### 8.5. API Key Authentication

#### Merchant API Keys
Each merchant has two API keys stored in Firestore:
- **Public Key (pk_...)**: Used in the webview/SDK for client-side operations
- **Secret Key (sk_...)**: Used for server-to-server API calls

#### Implementation
- Created `ApiKeyGuard` to validate API keys from headers
- Accepts API key via:
  - `Authorization: Bearer <api_key>`
  - `X-API-Key: <api_key>`
  - Query parameter: `?apiKey=<api_key>`
- Validates against merchant's `apiKey` or `apiSecret` in Firestore
- Ensures merchant status is 'approved'
- Attaches merchant info to request object

#### Example Usage
```typescript
// In SDK
const crlpay = new CRLPay({
  merchantId: 'mzPmbALb7FOktvhn8Frh',
  publicKey: 'pk_1b689d60c35a36c014b0809437bf55b8c063ca25d893a8c8',
});

// API calls from webview include:
headers: {
  'X-API-Key': 'pk_1b689d60c35a36c014b0809437bf55b8c063ca25d893a8c8'
}
```

#### Future Enhancements
1. Fetch payment plans from merchant configuration in backend
2. Implement actual BVN verification
3. Add webhook for Paystack callbacks
4. Implement manual payment page improvements
5. Add email notifications for each step
6. Add SMS notifications for repayment reminders

### 9. Merchant Mapping Verification

Customers are correctly mapped to merchants:
- Field: `registeredVia` contains merchantId
- Logged in backend on customer creation
- Can query customers by merchant: `GET /api/v1/customers/merchant/:merchantId`

**Example Firestore Document**:
```json
{
  "customerId": "abc123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "registeredVia": "mzPmbALb7FOktvhn8Frh",
  "createdAt": "2025-12-30T00:00:00Z"
}
```

### 10. Environment Setup

#### Required Environment Variables
```env
# Backend (.env)
PORT=3006
CORS_ORIGIN=http://localhost:3007,http://localhost:3008,http://localhost:3009,http://localhost:3010
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# Webview (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3006
```

### 11. File Structure

```
apps/customer-webview/
├── public/
│   ├── crlpay-sdk.js          # Merchant SDK
│   ├── demo.html              # Demo for testing
│   └── demo-real.html         # Real implementation demo
├── src/
│   └── app/
│       ├── checkout/
│       │   └── page.tsx       # Main checkout flow (Complete implementation)
│       └── pay/[paymentId]/
│           └── page.tsx       # Manual payment page
└── README.md
```

### 12. Contact & Support

For issues or questions:
- Check backend logs for error details
- Verify CORS settings if cross-origin errors occur
- Ensure all required environment variables are set
- Test with real merchant ID from Firestore

---

**Last Updated**: 2025-12-30
**Status**: ✅ Complete checkout flow implemented - Ready for backend API endpoints
