import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import { liquidationService, LiquidationCalculation } from '../services/liquidation.service';
import { getLoan } from '../services/loan.service';

export default function LoanLiquidation() {
  const { id: loanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<any>(null);
  const [calculation, setCalculation] = useState<LiquidationCalculation | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (loanId) {
      loadLoanAndCalculate();
    }
  }, [loanId]);

  const loadLoanAndCalculate = async () => {
    try {
      setLoading(true);
      const loanData = await getLoan(loanId!);
      setLoan(loanData);

      // Calculate full liquidation by default
      const calc = await liquidationService.calculateLiquidation(loanId!);
      setCalculation(calc);
    } catch (error: any) {
      toast.error('Failed to load loan details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePartial = async () => {
    if (!partialAmount || parseFloat(partialAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setCalculating(true);
      const calc = await liquidationService.calculateLiquidation(
        loanId!,
        parseFloat(partialAmount)
      );
      setCalculation(calc);
      toast.success('Partial liquidation calculated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to calculate');
    } finally {
      setCalculating(false);
    }
  };

  const handleProcessLiquidation = async () => {
    if (!calculation) return;

    const confirmed = confirm(
      `Are you sure you want to process ${calculation.isFullLiquidation ? 'full' : 'partial'} liquidation of ₦${calculation.totalDue.toLocaleString()}?`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      const reference = `LIQUIDATION_${Date.now()}`;
      
      await liquidationService.processLiquidation({
        loanId: loanId!,
        amount: calculation.totalDue,
        reference,
        method: 'bank_transfer',
      });

      toast.success('Liquidation processed successfully!');
      setTimeout(() => {
        navigate(`/loans/${loanId}`);
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process liquidation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!loan || !calculation) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loan not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/loans/${loanId}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Loan
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Loan Liquidation</h1>
        </div>

        {/* Loan Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Loan Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Loan Account</p>
              <p className="font-semibold">{loan.loanAccountNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Principal</p>
              <p className="font-semibold">₦{loan.principalAmount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount Paid</p>
              <p className="font-semibold text-green-600">₦{loan.amountPaid?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="font-semibold text-orange-600">₦{loan.amountRemaining?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Liquidation Calculation */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">
              {calculation.isFullLiquidation ? 'Full Liquidation' : 'Partial Liquidation'}
            </h2>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Amount Due</p>
              <p className="text-3xl font-bold text-green-600">
                ₦{calculation.totalDue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Unpaid Principal</p>
              <p className="text-xl font-semibold">
                ₦{calculation.breakdown.unpaidPrincipal.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Accrued Interest</p>
              <p className="text-xl font-semibold">
                ₦{calculation.breakdown.accruedInterest.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Late Fees</p>
              <p className="text-xl font-semibold">
                ₦{calculation.breakdown.lateFees.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Installments Included */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Installments Included ({calculation.breakdown.schedulesIncluded.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {calculation.breakdown.schedulesIncluded.map((schedule) => (
                <div
                  key={schedule.scheduleId}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded text-sm"
                >
                  <div>
                    <span className="font-medium">Installment #{schedule.installmentNumber}</span>
                    <span className="text-gray-500 ml-2">
                      Due: {new Date(schedule.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div>Principal: ₦{schedule.principalAmount.toLocaleString()}</div>
                    <div className="text-green-600">
                      Interest: ₦{(schedule.proratedInterest || 0).toLocaleString()}
                      {schedule.proratedInterest !== schedule.interestAmount && (
                        <span className="text-xs text-gray-500"> (prorated)</span>
                      )}
                    </div>
                    {schedule.lateFee > 0 && (
                      <div className="text-red-600">Late Fee: ₦{schedule.lateFee.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!calculation.isFullLiquidation && calculation.remainingBalance && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This is a partial liquidation. Remaining balance after payment: 
                <span className="font-semibold"> ₦{calculation.remainingBalance.toLocaleString()}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleProcessLiquidation}
            disabled={processing}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {processing ? 'Processing...' : `Process ${calculation.isFullLiquidation ? 'Full' : 'Partial'} Liquidation`}
          </button>
        </div>

        {/* Partial Liquidation Calculator */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Calculate Partial Liquidation</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter a custom amount to see how much of the loan can be paid off with that amount.
          </p>
          <div className="flex gap-3">
            <input
              type="number"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="Enter amount (e.g., 200000)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCalculatePartial}
              disabled={calculating || !partialAmount}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating ? 'Calculating...' : 'Calculate'}
            </button>
            <button
              onClick={loadLoanAndCalculate}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Reset to Full
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How Liquidation Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Interest is prorated based on the number of days elapsed</li>
            <li>• Overdue payments include full interest plus late fees</li>
            <li>• Payments are applied to overdue installments first</li>
            <li>• You can pay off the entire loan or specific installments</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
