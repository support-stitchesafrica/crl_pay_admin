/**
 * CRL Pay JavaScript SDK
 * Version: 1.0.0
 *
 * Usage:
 * <script src="https://crlpay.com/sdk/crlpay-sdk.js"></script>
 *
 * Example:
 * const crlpay = new CRLPay({
 *   merchantId: 'your-merchant-id',
 *   publicKey: 'your-public-key',
 * });
 *
 * crlpay.checkout({
 *   amount: 50000,
 *   email: 'customer@example.com',
 *   reference: 'ORDER_12345',
 *   onSuccess: (data) => console.log('Success', data),
 *   onClose: () => console.log('Closed'),
 *   onError: (error) => console.error('Error', error),
 * });
 */

(function(window) {
  'use strict';

  const WEBVIEW_URL = 'http://localhost:3010'; // Change to production URL

  class CRLPay {
    constructor(config) {
      if (!config.merchantId) {
        throw new Error('merchantId is required');
      }

      this.merchantId = config.merchantId;
      this.publicKey = config.publicKey;
      this.mode = config.mode || 'iframe'; // 'iframe' or 'popup'
      this.baseUrl = config.baseUrl || WEBVIEW_URL;

      this.overlay = null;
      this.iframe = null;
      this.popup = null;
      this.messageHandler = null;
    }

    /**
     * Open checkout flow
     * @param {Object} options - Checkout options
     * @param {number} options.amount - Purchase amount
     * @param {string} options.email - Customer email
     * @param {string} options.reference - Unique transaction reference
     * @param {Function} options.onSuccess - Success callback
     * @param {Function} options.onClose - Close callback
     * @param {Function} options.onError - Error callback
     * @param {Object} options.metadata - Additional metadata
     */
    checkout(options) {
      if (!options.amount || !options.email) {
        throw new Error('amount and email are required');
      }

      this.options = {
        merchantId: this.merchantId,
        amount: options.amount,
        email: options.email,
        reference: options.reference || this._generateReference(),
        metadata: options.metadata || {},
        onSuccess: options.onSuccess || (() => {}),
        onClose: options.onClose || (() => {}),
        onError: options.onError || (() => {}),
      };

      if (this.mode === 'popup') {
        this._openPopup();
      } else {
        this._openIframe();
      }

      this._setupMessageListener();
    }

    /**
     * Open manual payment page for a failed payment
     * @param {Object} options - Payment options
     * @param {string} options.paymentId - Payment ID
     * @param {Function} options.onSuccess - Success callback
     * @param {Function} options.onClose - Close callback
     * @param {Function} options.onError - Error callback
     */
    makePayment(options) {
      if (!options.paymentId) {
        throw new Error('paymentId is required');
      }

      this.options = {
        paymentId: options.paymentId,
        onSuccess: options.onSuccess || (() => {}),
        onClose: options.onClose || (() => {}),
        onError: options.onError || (() => {}),
      };

      const url = `${this.baseUrl}/pay/${options.paymentId}`;

      if (this.mode === 'popup') {
        this._openPopup(url);
      } else {
        this._openIframe(url);
      }

      this._setupMessageListener();
    }

    /**
     * Generate unique reference
     * @private
     */
    _generateReference() {
      return 'CRLPAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Build checkout URL
     * @private
     */
    _buildCheckoutUrl() {
      const params = new URLSearchParams({
        merchantId: this.options.merchantId,
        amount: this.options.amount,
        email: this.options.email,
        reference: this.options.reference,
        apiKey: this.publicKey || '', // Add public key to URL
      });

      return `${this.baseUrl}/checkout?${params.toString()}`;
    }

    /**
     * Open iframe overlay
     * @private
     */
    _openIframe(customUrl) {
      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.id = 'crlpay-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease-in;
      `;

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'crlpay-iframe';
      this.iframe.src = customUrl || this._buildCheckoutUrl();
      this.iframe.style.cssText = `
        border: none;
        width: 100%;
        max-width: 500px;
        height: 90vh;
        max-height: 700px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
      `;

      this.overlay.appendChild(this.iframe);
      document.body.appendChild(this.overlay);

      // Close on overlay click
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Add animations
      this._addAnimations();
    }

    /**
     * Open popup window
     * @private
     */
    _openPopup(customUrl) {
      const width = 500;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      const features = `
        width=${width},
        height=${height},
        left=${left},
        top=${top},
        toolbar=no,
        menubar=no,
        scrollbars=yes,
        resizable=yes
      `;

      this.popup = window.open(
        customUrl || this._buildCheckoutUrl(),
        'CRLPayCheckout',
        features
      );

      // Check if popup was blocked
      if (!this.popup || this.popup.closed || typeof this.popup.closed === 'undefined') {
        this.options.onError({ message: 'Popup blocked. Please allow popups for this site.' });
      }

      // Monitor popup close
      const checkPopup = setInterval(() => {
        if (!this.popup || this.popup.closed) {
          clearInterval(checkPopup);
          this.close();
        }
      }, 1000);
    }

    /**
     * Setup message listener for iframe/popup communication
     * @private
     */
    _setupMessageListener() {
      this.messageHandler = (event) => {
        // Verify origin in production
        // if (event.origin !== this.baseUrl) return;

        const { type, data, source } = event.data;

        if (source !== 'crlpay-webview') return;

        switch (type) {
          case 'CRLPAY_READY':
            console.log('CRL Pay webview ready', data);
            break;

          case 'CRLPAY_SUCCESS':
            this.options.onSuccess(data);
            this.close();
            break;

          case 'CRLPAY_CLOSE':
            this.close();
            break;

          case 'CRLPAY_ERROR':
            this.options.onError(data);
            break;

          case 'CRLPAY_CUSTOMER_REGISTERED':
            console.log('Customer registered', data);
            break;

          case 'CRLPAY_PLAN_SELECTED':
            console.log('Plan selected', data);
            break;

          case 'CRLPAY_CARD_AUTHORIZATION_REQUIRED':
            console.log('Card authorization required', data);
            break;

          case 'CRLPAY_FAILED':
            this.options.onError(data);
            break;

          default:
            console.log('Unknown message type', type);
        }
      };

      window.addEventListener('message', this.messageHandler);
    }

    /**
     * Close the checkout
     */
    close() {
      // Remove message listener
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
        this.messageHandler = null;
      }

      // Close iframe
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
        this.iframe = null;
        document.body.style.overflow = '';
      }

      // Close popup
      if (this.popup && !this.popup.closed) {
        this.popup.close();
        this.popup = null;
      }

      // Call onClose callback
      if (this.options && this.options.onClose) {
        this.options.onClose();
      }
    }

    /**
     * Add CSS animations
     * @private
     */
    _addAnimations() {
      if (document.getElementById('crlpay-animations')) return;

      const style = document.createElement('style');
      style.id = 'crlpay-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Export to window
  window.CRLPay = CRLPay;

})(window);
