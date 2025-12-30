'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface Payment {
  paymentId: string;
  loanId: string;
  amount: number;
  installmentNumber: number;
  status: string;
  dueDate: string;
}

export default function ManualPaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    // Check if we're returning from Paystack
    const reference = searchParams.get('reference');
    const status = searchParams.get('status');

    if (reference && status === 'success') {
      handlePaymentVerification(reference);
      return;
    }

    // Load payment details
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/payments/${paymentId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }

      const result = await response.json();
      setPayment(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment details');
      sendMessageToParent('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentVerification = async (reference: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/payments/verify?reference=${reference}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const result = await response.json();

      if (result.data.status === 'success') {
        sendMessageToParent('success', result.data);
      } else {
        setError('Payment verification failed. Please contact support.');
        sendMessageToParent('failed', { message: 'Payment verification failed' });
      }
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
      sendMessageToParent('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    try {
      setProcessingPayment(true);
      setError(null);

      // Generate payment link
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/payments/${paymentId}/generate-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate payment link');
      }

      const result = await response.json();

      // Redirect to Paystack payment page
      if (result.data.paymentUrl) {
        window.location.href = result.data.paymentUrl;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setProcessingPayment(false);
      sendMessageToParent('error', { message: err.message });
    }
  };

  const sendMessageToParent = (type: string, data: any) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: `CRLPAY_${type.toUpperCase()}`,
          data,
          source: 'crlpay-webview',
        },
        '*'
      );
    }
  };

  const handleClose = () => {
    sendMessageToParent('close', {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-4">
        <div className="max-w-md w-full text-center">
          <svg className="mx-auto h-10 w-10 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (payment?.status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Payment Completed</h2>
          <p className="text-sm text-gray-600 mb-4">This payment has already been successfully processed.</p>
          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="font-bold text-lg">CRL Pay</div>
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="ml-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-base mb-3">Payment Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Installment:</span>
              <span className="font-medium">#{payment?.installmentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="font-bold text-xl text-blue-600">
                ₦{payment?.amount?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-xs text-yellow-800">
            Your automatic payment could not be processed. Please complete this manual payment to keep your loan current.
          </p>
        </div>

        <button
          onClick={initiatePayment}
          disabled={processingPayment}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {processingPayment ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay with Paystack
            </>
          )}
        </button>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Secure payment powered by Paystack
          </p>
        </div>
      </div>
    </div>
  );
}
