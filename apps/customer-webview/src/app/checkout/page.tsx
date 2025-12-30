'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type CheckoutStep = 'customer-info' | 'plan-selection' | 'credit-check' | 'card-authorization' | 'success';

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bvn: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
}

interface FinancingPlan {
  planId: string;
  financierId: string;
  name: string;
  description?: string;
  tenor: {
    value: number;
    period: string;
  };
  interestRate: number;
  minimumAmount: number;
  maximumAmount: number;
  gracePeriod: {
    value: number;
    period: string;
  };
  lateFee: {
    type: 'fixed' | 'percentage';
    amount: number;
  };
  allowEarlyRepayment: boolean;
  status: string;
  isActive: boolean;
}

interface PlanMerchantMapping {
  mappingId: string;
  planId: string;
  merchantId: string;
  financierId: string;
  fundsAllocated: number;
  currentAllocation: number;
  status: string;
}

interface PaymentPlan {
  mapping: PlanMerchantMapping;
  plan: FinancingPlan;
  installmentAmount: number;
  numberOfInstallments: number;
  totalAmount: number;
  frequency: string;
}

interface RepaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<CheckoutStep>('customer-info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merchant and order info from URL params
  const merchantId = searchParams.get('merchantId') || '';
  const amount = parseFloat(searchParams.get('amount') || '0');
  const customerEmail = searchParams.get('email') || '';
  const reference = searchParams.get('reference') || '';
  const apiKey = searchParams.get('apiKey') || ''; // Public key from merchant

  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    email: customerEmail,
    phone: '',
    bvn: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
  });

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<PaymentPlan[]>([]);
  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentScheduleItem[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [creditScore, setCreditScore] = useState<number>(0);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Send message to parent that webview is ready
    sendMessageToParent('ready', { merchantId, amount, reference });

    // Check if customer exists with the provided email
    if (customerEmail) {
      checkExistingCustomer(customerEmail);
    }
  }, []);

  // Countdown timer for success page
  useEffect(() => {
    if (step === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step]);

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

  // Helper function to get headers with API key
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  });

  const checkExistingCustomer = async (email: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/customers/by-email/${email}`,
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        const customer = result.data;

        // Customer exists - skip form and go to credit check
        setCustomerId(customer.customerId);
        setCustomerData({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          bvn: customer.bvn,
          dateOfBirth: customer.dateOfBirth,
          address: customer.address,
          city: customer.city,
          state: customer.state,
        });

        // Proceed directly to credit check
        await performCreditAssessment(customer.customerId);
      }
    } catch (err) {
      // Customer doesn't exist - show registration form
      console.log('New customer - showing registration form');
    }
  };

  const performCreditAssessment = async (userId: string) => {
    setLoading(true);
    setError(null);
    setStep('credit-check');

    try {
      // Call credit assessment API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/credit/assess`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            customerId: userId,
            merchantId,
            requestedAmount: amount,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Credit assessment failed');
      }

      const result = await response.json();
      const creditData = result.data;

      // Store credit score
      setCreditScore(creditData.totalScore || 0);

      // Check if approved (instant_approval, conditional_approval, or manual_review are considered approved)
      const isApproved = ['instant_approval', 'conditional_approval', 'manual_review'].includes(creditData.decision);
      
      if (isApproved) {
        sendMessageToParent('credit_approved', creditData);

        // Fetch real financing plans mapped to this merchant
        await fetchMappedPlans();
        setStep('plan-selection');
      } else {
        // Credit declined
        const declineReason = creditData.decisionReasons?.join('. ') || 'Your credit application was not approved at this time.';
        setError(declineReason);
        sendMessageToParent('credit_denied', creditData);
        setStep('customer-info'); // Go back to show error
      }
    } catch (err: any) {
      setError(err.message || 'Credit assessment failed');
      sendMessageToParent('error', { message: err.message });
      setStep('customer-info'); // Go back to show error
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerInfoSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Register customer
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/customers`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            ...customerData,
            merchantId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register customer');
      }

      const result = await response.json();
      const newCustomerId = result.data.customerId;

      setCustomerId(newCustomerId);
      sendMessageToParent('customer_registered', result.data);

      // Step 2: Perform credit assessment
      await performCreditAssessment(newCustomerId);
    } catch (err: any) {
      setError(err.message || 'Failed to register customer');
      sendMessageToParent('error', { message: err.message });
      setLoading(false);
    }
  };

  const fetchMappedPlans = async () => {
    try {
      setLoading(true);
      
      // Fetch plan-merchant mappings for this merchant
      const mappingsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/plan-merchant-mappings?merchantId=${merchantId}`,
        {
          headers: getHeaders(),
        }
      );

      if (!mappingsResponse.ok) {
        throw new Error('Failed to fetch financing plans');
      }

      const mappingsResult = await mappingsResponse.json();
      const mappings: PlanMerchantMapping[] = mappingsResult.data || [];

      // Filter only active mappings
      const activeMappings = mappings.filter(m => m.status === 'active');

      if (activeMappings.length === 0) {
        setError('No financing plans available for this merchant');
        return;
      }

      // Fetch plan details for each mapping
      const planDetailsPromises = activeMappings.map(async (mapping) => {
        const planResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/financing-plans/${mapping.planId}`,
          {
            headers: getHeaders(),
          }
        );
        const planResult = await planResponse.json();
        return planResult.data as FinancingPlan;
      });

      const plans = await Promise.all(planDetailsPromises);

      // Calculate payment plans based on real financing plans
      const paymentPlans: PaymentPlan[] = activeMappings.map((mapping, index) => {
        const plan = plans[index];
        
        // Calculate tenor in days
        let tenorInDays = plan.tenor.value;
        if (plan.tenor.period === 'WEEKS') tenorInDays *= 7;
        else if (plan.tenor.period === 'MONTHS') tenorInDays *= 30;
        else if (plan.tenor.period === 'YEARS') tenorInDays *= 365;

        // Calculate total with interest (monthly interest rate)
        const monthlyRate = plan.interestRate / 100;
        const months = tenorInDays / 30;
        const totalWithInterest = amount * (1 + (monthlyRate * months));

        // Determine installment frequency and count
        let frequency = 'monthly';
        let numberOfInstallments = Math.ceil(months);
        
        if (tenorInDays <= 30) {
          frequency = 'weekly';
          numberOfInstallments = 4;
        } else if (tenorInDays <= 60) {
          frequency = 'bi-weekly';
          numberOfInstallments = 4;
        }

        const installmentAmount = Math.ceil(totalWithInterest / numberOfInstallments);

        return {
          mapping,
          plan,
          installmentAmount,
          numberOfInstallments,
          totalAmount: Math.ceil(totalWithInterest),
          frequency,
        };
      });

      setAvailablePlans(paymentPlans);
    } catch (err: any) {
      setError(err.message || 'Failed to load financing plans');
    } finally {
      setLoading(false);
    }
  };

  const calculateRepaymentSchedule = (plan: PaymentPlan): RepaymentScheduleItem[] => {
    const schedule: RepaymentScheduleItem[] = [];
    const today = new Date();

    // Add grace period if applicable
    let startDate = new Date(today);
    if (plan.plan.gracePeriod) {
      let graceDays = plan.plan.gracePeriod.value;
      if (plan.plan.gracePeriod.period === 'WEEKS') graceDays *= 7;
      else if (plan.plan.gracePeriod.period === 'MONTHS') graceDays *= 30;
      startDate.setDate(today.getDate() + graceDays);
    }

    // Determine interval in days based on frequency
    const intervalDays = plan.frequency === 'weekly' ? 7 : plan.frequency === 'bi-weekly' ? 14 : 30;

    for (let i = 0; i < plan.numberOfInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(startDate.getDate() + (intervalDays * (i + 1)));

      schedule.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: plan.installmentAmount,
      });
    }

    return schedule;
  };

  const handlePlanSelect = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    const schedule = calculateRepaymentSchedule(plan);
    setRepaymentSchedule(schedule);
    setShowSchedule(true);
  };

  const handleConfirmPlan = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);
    setShowSchedule(false);

    try {
      // Step 2: Perform credit assessment
      setStep('credit-check');

      // In production, call credit assessment API
      // For now, simulate approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Create loan
      setStep('card-authorization');
      sendMessageToParent('plan_selected', { plan: selectedPlan, schedule: repaymentSchedule });
    } catch (err: any) {
      setError(err.message || 'Credit assessment failed');
      sendMessageToParent('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCardAuthorization = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Initialize Paystack transaction for card authorization
      const initResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/payments/initialize-authorization`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            email: customerData.email,
            amount: selectedPlan?.installmentAmount || 10000, // Amount for auth (₦100 minimum)
            merchantId,
            customerId,
          }),
        }
      );

      if (!initResponse.ok) {
        throw new Error('Failed to initialize payment');
      }

      const initData = await initResponse.json();
      const authorizationUrl = initData.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error('No authorization URL received');
      }

      // Send message to parent to open Paystack
      sendMessageToParent('card_authorization_required', {
        url: authorizationUrl,
        reference: initData.data?.reference,
      });

      // Open Paystack in a new window/popup
      const paystackWindow = window.open(authorizationUrl, 'paystack', 'width=500,height=700');

      // Poll for completion
      const checkInterval = setInterval(async () => {
        if (paystackWindow?.closed) {
          clearInterval(checkInterval);
          // Verify the transaction
          try {
            const verifyResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/payments/verify/${initData.data?.reference}`
            );

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              if (verifyData.data?.status === 'success') {
                const authorizationCode = verifyData.data?.authorization?.authorization_code;

                // Step 2: Create loan record
                const loanResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/loans/create`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      customerId,
                      merchantId,
                      amount,
                      plan: selectedPlan,
                      repaymentSchedule,
                      authorizationCode,
                      reference,
                    }),
                  }
                );

                if (!loanResponse.ok) {
                  throw new Error('Failed to create loan record');
                }

                const loanData = await loanResponse.json();
                const loanId = loanData.data?.loanId;

                // Step 3: Disburse funds to merchant
                const disbursementResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'}/api/v1/disbursements/process`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      loanId,
                      merchantId,
                      amount,
                    }),
                  }
                );

                if (!disbursementResponse.ok) {
                  throw new Error('Failed to disburse funds');
                }

                const disbursementData = await disbursementResponse.json();

                // Step 4: Show success and prepare to close
                setStep('success');

                // Send comprehensive success callback
                sendMessageToParent('success', {
                  loanId,
                  customerId,
                  merchantId,
                  amount,
                  plan: selectedPlan,
                  repaymentSchedule,
                  authorizationCode,
                  reference,
                  disbursement: disbursementData.data,
                  customer: customerData,
                  creditScore,
                });

                // Auto-close after 5 seconds
                setTimeout(() => {
                  handleClose();
                }, 5000);
              } else {
                throw new Error('Card authorization failed');
              }
            }
          } catch (err: any) {
            setError(err.message || 'Failed to verify card authorization');
          } finally {
            setLoading(false);
          }
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (paystackWindow && !paystackWindow.closed) {
          paystackWindow.close();
        }
        setLoading(false);
      }, 300000);
    } catch (err: any) {
      setError(err.message || 'Card authorization failed');
      sendMessageToParent('error', { message: err.message });
      setLoading(false);
    }
  };

  // Render different steps
  if (step === 'customer-info') {
    return (
      <div className="h-screen flex flex-col bg-white">
        {/* Fixed Header */}
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center flex-shrink-0">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-800">Complete Your Information</h2>
              <p className="text-sm text-gray-600">Step 1 of 3</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded p-3 mb-4">
              <p className="text-sm text-blue-900 font-medium">Purchase Amount: ₦{amount.toLocaleString()}</p>
            </div>

            <form id="customer-info-form" onSubmit={handleCustomerInfoSubmit} className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={customerData.firstName}
                    onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={customerData.lastName}
                    onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+2348012345678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">BVN</label>
                <input
                  type="text"
                  value={customerData.bvn}
                  onChange={(e) => setCustomerData({ ...customerData, bvn: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345678901"
                  maxLength={11}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for identity verification
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={customerData.dateOfBirth}
                  onChange={(e) => setCustomerData({ ...customerData, dateOfBirth: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                <input
                  type="text"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main Street, Ikeja"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">City</label>
                  <input
                    type="text"
                    value={customerData.city}
                    onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Lagos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">State</label>
                  <select
                    value={customerData.state}
                    onChange={(e) => setCustomerData({ ...customerData, state: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select State</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">Abuja (FCT)</option>
                    <option value="Rivers">Rivers</option>
                    <option value="Oyo">Oyo</option>
                    <option value="Kano">Kano</option>
                    <option value="Kaduna">Kaduna</option>
                    <option value="Ogun">Ogun</option>
                    <option value="Anambra">Anambra</option>
                    <option value="Delta">Delta</option>
                    <option value="Edo">Edo</option>
                    <option value="Enugu">Enugu</option>
                    <option value="Imo">Imo</option>
                    <option value="Akwa Ibom">Akwa Ibom</option>
                    <option value="Ondo">Ondo</option>
                    <option value="Osun">Osun</option>
                    <option value="Kwara">Kwara</option>
                    <option value="Plateau">Plateau</option>
                    <option value="Benue">Benue</option>
                    <option value="Cross River">Cross River</option>
                    <option value="Abia">Abia</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Sticky Footer Button */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              type="submit"
              form="customer-info-form"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:bg-gray-400 flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'plan-selection') {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 max-w-md mx-auto">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">Choose Payment Plan</h2>
            <p className="text-sm text-gray-600">Step 2 of 3</p>
          </div>

          <div className="bg-blue-50 rounded p-3 mb-4">
            <p className="text-sm text-blue-900 font-medium">Amount: ₦{amount.toLocaleString()}</p>
          </div>

          <div className="space-y-4">
            {availablePlans.map((plan) => (
              <button
                key={plan.mapping.mappingId}
                onClick={() => handlePlanSelect(plan)}
                className="w-full bg-white border-2 border-gray-300 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all text-left"
              >
                <div className="mb-3">
                  <h3 className="font-bold text-xl text-gray-900 mb-2">{plan.plan.name}</h3>
                  {plan.plan.description && (
                    <p className="text-sm text-gray-600 mb-3">{plan.plan.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Tenor</p>
                      <p className="text-sm font-semibold text-gray-900">{plan.plan.tenor.value} {plan.plan.tenor.period.toLowerCase()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Interest Rate</p>
                      <p className="text-sm font-semibold text-gray-900">{plan.plan.interestRate}% monthly</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Min Amount</p>
                      <p className="text-sm font-semibold text-gray-900">₦{plan.plan.minimumAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Max Amount</p>
                      <p className="text-sm font-semibold text-gray-900">₦{plan.plan.maximumAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {plan.plan.allowEarlyRepayment && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Early repayment allowed</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Repayment Amount</p>
                      <p className="text-xs text-gray-500">{plan.numberOfInstallments} {plan.frequency} payments</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">₦{plan.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-xs text-blue-600 font-medium">Click to view repayment schedule →</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Repayment Schedule Modal */}
        {showSchedule && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                <h3 className="font-bold text-lg">Repayment Schedule</h3>
                <button onClick={() => setShowSchedule(false)} className="text-white hover:text-gray-200">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <h4 className="font-bold text-lg text-gray-900 mb-1">{selectedPlan.plan.name}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedPlan.numberOfInstallments} {selectedPlan.frequency} payments
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Purchase Amount:</span>
                    <span className="font-semibold text-gray-900">₦{amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Interest ({selectedPlan.plan.interestRate}% monthly):</span>
                    <span className="font-semibold text-gray-900">₦{(selectedPlan.totalAmount - amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-blue-300">
                    <span className="text-gray-900">Total to Repay:</span>
                    <span className="text-blue-600">₦{selectedPlan.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gray-900 text-base">Payment Schedule</h5>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const csv = [
                            ['Payment Number', 'Due Date', 'Amount (₦)'],
                            ...repaymentSchedule.map(item => [
                              item.installmentNumber,
                              new Date(item.dueDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }),
                              item.amount
                            ])
                          ].map(row => row.join(',')).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `repayment-schedule-${Date.now()}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        CSV
                      </button>
                      <button
                        onClick={() => {
                          const scheduleText = `${selectedPlan.plan.name} - Repayment Schedule\n\n` +
                            `Purchase Amount: ₦${amount.toLocaleString()}\n` +
                            `Interest (${selectedPlan.plan.interestRate}% monthly): ₦${(selectedPlan.totalAmount - amount).toLocaleString()}\n` +
                            `Total: ₦${selectedPlan.totalAmount.toLocaleString()}\n\n` +
                            `Payment Schedule:\n` +
                            repaymentSchedule.map(item => 
                              `Payment ${item.installmentNumber}: ₦${item.amount.toLocaleString()} - Due: ${new Date(item.dueDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`
                            ).join('\n');
                          const blob = new Blob([scheduleText], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `repayment-schedule-${Date.now()}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 px-3 py-1.5 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        TXT
                      </button>
                    </div>
                  </div>
                  {repaymentSchedule.map((item) => (
                    <div key={item.installmentNumber} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Payment {item.installmentNumber} of {selectedPlan.numberOfInstallments}</p>
                          <p className="text-xs text-gray-600 mt-1">Due: {new Date(item.dueDate).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                        </div>
                        <p className="font-bold text-lg text-blue-600">₦{item.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-white">
                <button
                  onClick={handleConfirmPlan}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:bg-gray-400 flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Confirm Plan'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'credit-check') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Checking Eligibility</h2>
          <p className="text-sm text-gray-600">Please wait while we verify your information...</p>
        </div>
      </div>
    );
  }

  if (step === 'card-authorization') {
    return (
      <div className="h-screen flex flex-col bg-white">
        {/* Fixed Header */}
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center flex-shrink-0">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-800">Authorize Payment</h2>
              <p className="text-sm text-gray-600">Step 3 of 3</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-green-900 text-sm">Approved!</p>
                  <p className="text-xs text-green-700">You're eligible for this payment plan</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-base text-gray-900 mb-4">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Plan:</span>
                  <span className="font-semibold text-gray-900">{selectedPlan?.plan.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payment per installment:</span>
                  <span className="font-semibold text-gray-900">₦{selectedPlan?.installmentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Frequency:</span>
                  <span className="font-semibold text-gray-900 capitalize">{selectedPlan?.frequency}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Number of installments:</span>
                  <span className="font-semibold text-gray-900">{selectedPlan?.numberOfInstallments}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-3 mt-3">
                  <span className="text-sm font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">₦{selectedPlan?.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-xs text-blue-800">
                Your card will be authorized for automatic payments. You can cancel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer Button */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleCardAuthorization}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:bg-gray-400 flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Authorize Card'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Approved!</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your Buy Now, Pay Later purchase has been successfully processed.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Purchase Amount:</span>
                <span className="font-semibold text-gray-900">₦{amount.toLocaleString()}</span>
              </div>
              {selectedPlan && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Plan:</span>
                    <span className="font-semibold text-gray-900">{selectedPlan.plan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Installments:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedPlan.numberOfInstallments} × ₦{selectedPlan.installmentAmount.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            A confirmation email has been sent to {customerData.email}
          </p>

          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-8 py-3 rounded font-medium hover:bg-blue-700 w-full"
          >
            Done
          </button>

          <p className="text-xs text-gray-400 mt-3">
            {countdown > 0 ? `Closing in ${countdown} seconds...` : 'Closing...'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
