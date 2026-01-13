'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { liquidationService, LiquidationCalculation } from '../../services/liquidation.service';

export default function LiquidationPage() {
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loanId');
  const apiKey = searchParams.get('apiKey');

  const [calculation, setCalculation] = useState<LiquidationCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liquidationType, setLiquidationType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (loanId && apiKey) {
      calculateLiquidation();
    }
  }, [loanId, apiKey]);

  const calculateLiquidation = async (amount?: number) => {
    if (!loanId || !apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const result = await liquidationService.calculateLiquidation(
        loanId,
        amount,
        apiKey
      );
      setCalculation(result);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate liquidation');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePartial = () => {
    const amount = parseFloat(partialAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    calculateLiquidation(amount);
  };

  const handleProcessLiquidation = async () => {
    if (!loanId || !apiKey || !calculation) return;

    setProcessing(true);
    setError(null);

    try {
      const reference = `LIQ_${Date.now()}`;
      const amount = liquidationType === 'partial' ? parseFloat(partialAmount) : undefined;

      await liquidationService.processLiquidation(
        loanId,
        reference,
        amount,
        'manual',
        apiKey
      );

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process liquidation');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (!loanId || !apiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Request</h2>
            <p className="text-gray-600">Missing loan ID or API key</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Liquidation Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your loan has been {calculation?.isFullLiquidation ? 'fully' : 'partially'} liquidated.
            </p>
            {!calculation?.isFullLiquidation && calculation?.remainingBalance && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Remaining Balance: <span className="font-bold">{formatCurrency(calculation.remainingBalance)}</span>
                </p>
              </div>
            )}
            <button
              onClick={() => window.close()}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold mb-2">Loan Liquidation</h1>
            <p className="text-purple-100">Pay off your loan early</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Liquidation Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Liquidation Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setLiquidationType('full');
                    setPartialAmount('');
                    calculateLiquidation();
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    liquidationType === 'full'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">💯</div>
                    <div className="font-semibold text-gray-900">Full Liquidation</div>
                    <div className="text-xs text-gray-500 mt-1">Pay off entire loan</div>
                  </div>
                </button>

                <button
                  onClick={() => setLiquidationType('partial')}
                  className={`p-4 rounded-lg border-2 transition ${
                    liquidationType === 'partial'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold text-gray-900">Partial Liquidation</div>
                    <div className="text-xs text-gray-500 mt-1">Pay custom amount</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Partial Amount Input */}
            {liquidationType === 'partial' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Pay
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleCalculatePartial}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    Calculate
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Calculating...</p>
              </div>
            )}

            {/* Calculation Results */}
            {!loading && calculation && (
              <>
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 mb-1">Total Amount Due</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {formatCurrency(calculation.totalDue)}
                    </p>
                  </div>

                  {!calculation.isFullLiquidation && calculation.remainingBalance && (
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Remaining Balance</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(calculation.remainingBalance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Breakdown */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Principal</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(calculation.breakdown.unpaidPrincipal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Accrued Interest</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(calculation.breakdown.accruedInterest)}
                      </span>
                    </div>
                    {calculation.breakdown.lateFees > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-red-700">Late Fees</span>
                        <span className="font-semibold text-red-900">
                          {formatCurrency(calculation.breakdown.lateFees)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Installments Included */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Installments ({calculation.breakdown.schedulesIncluded.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {calculation.breakdown.schedulesIncluded.map((schedule) => (
                      <div
                        key={schedule.scheduleId}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <span className="text-gray-700">
                          Installment #{schedule.installmentNumber}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(
                            schedule.principalAmount +
                              (schedule.proratedInterest || 0) +
                              schedule.lateFee
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleProcessLiquidation}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="flex items-center justify-center">
                      <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                      Processing...
                    </span>
                  ) : (
                    `Pay ${formatCurrency(calculation.totalDue)}`
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  {calculation.isFullLiquidation
                    ? 'This will fully pay off your loan'
                    : 'This will partially pay off your loan'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
