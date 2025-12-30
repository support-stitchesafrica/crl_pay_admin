# CRL Pay Customer Webview

The embeddable checkout and payment interface for CRL Pay Buy Now Pay Later service.

## Features

- **Embeddable Checkout Flow**: Complete customer onboarding and loan approval
- **Manual Payment Interface**: Allow customers to make manual repayments
- **Responsive Design**: Works on desktop, mobile, and tablet
- **iframe/Popup Support**: Can be embedded or opened in a new window
- **PostMessage Communication**: Secure communication with parent page
- **Flutter/React Native Ready**: Can be embedded in mobile apps via WebView

## Usage

### 1. Include the SDK

```html
<script src="https://your-domain.com/crlpay-sdk.js"></script>
```

### 2. Initialize CRL Pay

```javascript
const crlpay = new CRLPay({
  merchantId: 'your-merchant-id',
  publicKey: 'your-public-key',
  mode: 'iframe', // or 'popup'
});
```

### 3. Start Checkout

```javascript
crlpay.checkout({
  amount: 50000,
  email: 'customer@example.com',
  reference: 'ORDER_12345',
  metadata: {
    product: 'iPhone 13 Pro',
    category: 'Electronics',
  },
  onSuccess: function(data) {
    console.log('Success!', data);
    // Redirect to success page or update UI
  },
  onClose: function() {
    console.log('Checkout closed');
  },
  onError: function(error) {
    console.error('Error:', error);
  },
});
```

### 4. Manual Payment (for failed auto-debits)

```javascript
crlpay.makePayment({
  paymentId: 'PAYMENT_ID_FROM_YOUR_SYSTEM',
  onSuccess: function(data) {
    console.log('Payment successful!', data);
  },
  onClose: function() {
    console.log('Payment page closed');
  },
  onError: function(error) {
    console.error('Payment error:', error);
  },
});
```

## Routes

### Checkout Flow
- **URL**: `/checkout?merchantId=xxx&amount=50000&email=customer@example.com`
- **Purpose**: Complete BNPL checkout process
- **Steps**:
  1. Customer information collection
  2. Payment plan selection
  3. Credit assessment
  4. Card authorization
  5. Success confirmation

### Manual Payment
- **URL**: `/pay/[paymentId]`
- **Purpose**: Manual repayment for failed auto-debits
- **Features**:
  - Display payment details
  - Generate Paystack payment link
  - Handle payment verification
  - Send success/failure messages to parent

## PostMessage Events

The webview communicates with the parent page using `postMessage`. All messages have the format:

```javascript
{
  type: 'CRLPAY_EVENT_NAME',
  data: { /* event data */ },
  source: 'crlpay-webview'
}
```

### Events Sent by Webview

| Event | Description | Data |
|-------|-------------|------|
| `CRLPAY_READY` | Webview loaded and ready | `{ merchantId, amount, reference }` |
| `CRLPAY_CUSTOMER_REGISTERED` | Customer info submitted | `{ customerId, email, ... }` |
| `CRLPAY_PLAN_SELECTED` | Payment plan chosen | `{ plan: { name, tenor, ... } }` |
| `CRLPAY_CARD_AUTHORIZATION_REQUIRED` | Card auth needed | `{ amount }` |
| `CRLPAY_SUCCESS` | Checkout/payment successful | `{ loanId, amount, plan }` |
| `CRLPAY_FAILED` | Payment failed | `{ message }` |
| `CRLPAY_ERROR` | Error occurred | `{ message }` |
| `CRLPAY_CLOSE` | User closed webview | `{}` |

## Styling

The webview is designed to be embeddable with:
- No external navigation or headers (for checkout flow)
- Compact header with close button
- Mobile-optimized layout
- Clean, modern UI
- Smooth animations

Recommended iframe dimensions:
- Width: `100%` (max-width: 500px)
- Height: `90vh` (max-height: 700px)

## Development

### Run Development Server

```bash
# From root directory (recommended)
npm run dev:webview

# OR from webview directory
cd apps/customer-webview
npm run dev
```

The webview will be available at `http://localhost:3010`

### Test the SDK

Open `http://localhost:3010/demo.html` to test the SDK integration.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3006
```

## Integration Examples

### Basic HTML Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
  <script src="https://your-domain.com/crlpay-sdk.js"></script>
</head>
<body>
  <button id="buy-now">Buy Now - Pay Later</button>

  <script>
    const crlpay = new CRLPay({
      merchantId: 'MERCHANT_123',
      publicKey: 'pk_live_xxx',
    });

    document.getElementById('buy-now').addEventListener('click', function() {
      crlpay.checkout({
        amount: 50000,
        email: 'customer@example.com',
        onSuccess: function(data) {
          alert('Success! Order approved.');
          window.location.href = '/order-confirmed';
        },
        onError: function(error) {
          alert('Error: ' + error.message);
        },
      });
    });
  </script>
</body>
</html>
```

### React Integration

```jsx
import { useEffect, useState } from 'react';

function CheckoutButton({ amount, email }) {
  const [crlpay, setCRLPay] = useState(null);

  useEffect(() => {
    // Load SDK
    const script = document.createElement('script');
    script.src = 'https://your-domain.com/crlpay-sdk.js';
    script.async = true;
    script.onload = () => {
      const instance = new window.CRLPay({
        merchantId: 'MERCHANT_123',
        publicKey: 'pk_live_xxx',
      });
      setCRLPay(instance);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = () => {
    if (!crlpay) return;

    crlpay.checkout({
      amount,
      email,
      onSuccess: (data) => {
        console.log('Success', data);
        // Handle success
      },
      onError: (error) => {
        console.error('Error', error);
        // Handle error
      },
    });
  };

  return (
    <button onClick={handleCheckout} disabled={!crlpay}>
      Pay with CRL Pay
    </button>
  );
}
```

### Flutter/WebView Integration

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class CRLPayWebView extends StatefulWidget {
  final String paymentUrl;

  CRLPayWebView({required this.paymentUrl});

  @override
  _CRLPayWebViewState createState() => _CRLPayWebViewState();
}

class _CRLPayWebViewState extends State<CRLPayWebView> {
  late WebViewController _controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('CRL Pay Checkout')),
      body: WebView(
        initialUrl: widget.paymentUrl,
        javascriptMode: JavascriptMode.unrestricted,
        javascriptChannels: {
          JavascriptChannel(
            name: 'CRLPay',
            onMessageReceived: (message) {
              // Handle postMessage from webview
              print('Message from CRL Pay: ${message.message}');

              if (message.message.contains('SUCCESS')) {
                Navigator.pop(context, 'success');
              }
            },
          ),
        },
      ),
    );
  }
}
```

## Security

- All customer data is encrypted in transit (HTTPS)
- BVN and sensitive data are encrypted at rest
- PostMessage origin verification (enable in production)
- Card details never touch your servers (Paystack handles)
- CSP headers configured for iframe security

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

## Production Deployment

### Vercel (Recommended for Next.js)

```bash
vercel --prod
```

### Environment Variables for Production

```env
NEXT_PUBLIC_API_URL=https://api.crlpay.com
NODE_ENV=production
```

## Support

For integration support, contact:
- Email: support@crlpay.com
- Documentation: https://docs.crlpay.com
- GitHub: https://github.com/crlpay/sdk

## License

Proprietary - CRL Pay
