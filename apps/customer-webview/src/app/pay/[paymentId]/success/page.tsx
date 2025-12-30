'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Payment {
  paymentId: string;
  loanId: string;
  amount: number;
  installmentNumber: number;
  status: string;
  succeededAt: string;
}

export default function PaymentSuccessPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

      if (response.ok) {
        const result = await response.json();
        setPayment(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch payment details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-8">Your payment has been processed successfully.</p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="space-y-3 text-left">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-sm">{payment?.paymentId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-bold text-xl text-green-600">
                  ₦{payment?.amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Installment:</span>
                <span className="font-medium">#{payment?.installmentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {payment?.succeededAt ? new Date(payment.succeededAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              A confirmation email has been sent to your registered email address.
              Keep this payment reference for your records.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.print()}
              className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt
            </button>

            <Link
              href="/"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Back to Home
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Powered by CRL Pay - Thank you for your payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
