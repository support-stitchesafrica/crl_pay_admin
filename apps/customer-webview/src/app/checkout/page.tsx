'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  checkoutService,
  customerService,
  creditService,
  plansService,
  loanService,
  paymentService,
} from '../../services';

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
  hasSavedCard?: boolean;
  savedAuthorizationCode?: string;
  cardType?: string;
  cardLast4?: string;
  cardBank?: string;
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
  const [checkingCustomer, setCheckingCustomer] = useState(true);
  const [paystackUrl, setPaystackUrl] = useState<string>('');
  const [showPaystackIframe, setShowPaystackIframe] = useState(false);
  const [reservationId, setReservationId] = useState<string>('');
  const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null);

  useEffect(() => {
    // Send message to parent that webview is ready
    sendMessageToParent('ready', { merchantId, amount, reference });

    // Check if customer exists with the provided email
    if (customerEmail) {
      checkExistingCustomer(customerEmail);
    } else {
      setCheckingCustomer(false);
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
    setCheckingCustomer(true);
    try {
      const customer = await customerService.getByEmail(email, apiKey);

      if (customer) {
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
      } else {
        // Customer doesn't exist - show registration form
        setCheckingCustomer(false);
      }
    } catch (err) {
      // Customer doesn't exist - show registration form
      console.log('New customer - showing registration form');
      setCheckingCustomer(false);
    }
  };

  const performCreditAssessment = async (userId: string) => {
    setCheckingCustomer(false);
    setLoading(true);
    setError(null);
    setStep('credit-check');

    try {
      // Call credit assessment API using service
      const creditData = await creditService.assessCredit({
        customerId: userId,
        merchantId,
        requestedAmount: amount,
        apiKey,
      });

      setCreditScore(creditData.totalScore || 0);

      const isApproved = ['instant_approval', 'conditional_approval', 'manual_review'].includes(creditData.decision);
      
      if (isApproved) {
        sendMessageToParent('credit_approved', creditData);

        // Check eligibility with race-safe allocation check
        await checkEligibilityAndPlans();
        
        // Check if customer has saved card
        try {
          const customer = await customerService.getById(userId, apiKey);
          
          // Check for paystackAuthorizationCode field
          if (customer?.paystackAuthorizationCode) {
            console.log('Customer has saved card:', customer.cardLast4);
            setCustomerData(prev => ({
              ...prev,
              hasSavedCard: true,
              savedAuthorizationCode: customer.paystackAuthorizationCode,
              cardType: customer.cardType,
              cardLast4: customer.cardLast4,
              cardBank: customer.cardBank,
            }));
          } else {
            console.log('No saved card found for customer');
          }
        } catch (err) {
          console.log('Could not check for saved card:', err);
        }
        
        setStep('plan-selection');
      } else {
        const declineReason = creditData.reason || 'Your credit application was not approved at this time.';
        setError(declineReason);
        sendMessageToParent('credit_denied', creditData);
        setStep('customer-info');
      }
    } catch (err: any) {
      setError(err.message || 'Credit assessment failed');
      sendMessageToParent('error', { message: err.message });
      setStep('customer-info');
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
      // Register customer using service
      const customer = await customerService.create({
        merchantId,
        ...customerData,
      }, apiKey);

      setCustomerId(customer.customerId);
      sendMessageToParent('customer_registered', customer);

      // Perform credit assessment
      await performCreditAssessment(customer.customerId);
    } catch (err: any) {
      setError(err.message || 'Failed to register customer');
      sendMessageToParent('error', { message: err.message });
      setLoading(false);
    }
  };

  const checkEligibilityAndPlans = async () => {
    try {
      setLoading(true);
      
      // Use race-safe eligibility check
      const eligibility = await checkoutService.checkEligibility({
        merchantId,
        amount,
        apiKey,
        customerId: customerId || undefined,
      });

      console.log('Eligibility response:', eligibility);

      if (!eligibility.eligible) {
        setError(eligibility.reason || 'No financing available');
        return;
      }

      // Check if eligibleMappings exists and has items
      const eligibleMappings = eligibility.eligibleMappings || [];
      
      if (eligibleMappings.length === 0) {
        setError('No financing plans available');
        return;
      }

      console.log('Eligible mappings:', eligibleMappings);

      // Fetch full plan details for eligible plans
      const paymentPlans: PaymentPlan[] = [];
      
      for (const eligibleMapping of eligibleMappings) {
        const plan = await plansService.getPlanById(eligibleMapping.planId, apiKey);
        const mappings = await plansService.getMerchantMappings(merchantId, apiKey);
        const selectedMapping = mappings.find(m => m.mappingId === eligibleMapping.mappingId);
        
        if (selectedMapping) {
          // Calculate payment details
          let tenorInDays = plan.tenor.value;
          if (plan.tenor.period === 'WEEKS') tenorInDays *= 7;
          else if (plan.tenor.period === 'MONTHS') tenorInDays *= 30;
          else if (plan.tenor.period === 'YEARS') tenorInDays *= 365;

          const monthlyRate = plan.interestRate / 100;
          const months = tenorInDays / 30;
          const totalWithInterest = amount * (1 + (monthlyRate * months));

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

          paymentPlans.push({
            mapping: selectedMapping,
            plan,
            installmentAmount,
            numberOfInstallments,
            totalAmount: Math.ceil(totalWithInterest),
            frequency,
          });
        }
      }

      setAvailablePlans(paymentPlans);
    } catch (err: any) {
      console.error('Eligibility check error:', err);
      const errorMessage = err.message || 'Failed to load financing plans';
      setError(errorMessage);
      sendMessageToParent('error', { message: errorMessage });
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

    setError(null);
    setShowSchedule(false);
    
    // Show loading during reservation (loading state will display over plan-selection)
    setLoading(true);

    try {
      // STEP 1: Reserve allocation (race-safe)
      const reservation = await checkoutService.reserveAllocation({
        reference,
        amount,
        customerId,
        apiKey,
      });

      setReservationId(reservation.reservationId);
      setReservationExpiry(new Date(reservation.expiresAt));

      // STEP 2: Initiate disbursement
      if (customerData.hasSavedCard && customerData.savedAuthorizationCode) {
        // Customer has saved card - initiate disbursement directly
        setStep('credit-check'); // Now change step for disbursement
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Initiate disbursement using service
        const disbursement = await checkoutService.initiateDisbursement({
          reference,
          reservationId: reservation.reservationId,
          customerId,
          apiKey,
        });

        if (!disbursement || !disbursement.loanId) {
          throw new Error('Disbursement failed - no loan created');
        }

        // Show success
        setStep('success');
        sendMessageToParent('success', {
          loanId: disbursement.loanId,
          loanAccountNumber: disbursement.loanAccountNumber,
          customerId,
          amount,
          plan: selectedPlan,
          repaymentSchedule,
          authorizationCode: customerData.savedAuthorizationCode,
          reference,
          disbursementReference: disbursement.disbursementReference,
          customer: customerData,
          creditScore,
        });

        setTimeout(() => {
          handleClose();
        }, 5000);
      } else {
        // No saved card - proceed to card authorization
        setStep('card-authorization');
        sendMessageToParent('plan_selected', { plan: selectedPlan, schedule: repaymentSchedule });
      }
    } catch (err: any) {
      console.error('Confirm plan error:', err);
      const errorMessage = err.message || 'Failed to process payment';
      setError(errorMessage);
      setStep('plan-selection'); // Go back to plan selection to show error
      sendMessageToParent('error', { message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleCardAuthorization = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Initialize Paystack transaction using service
      const initData = await paymentService.initializeAuthorization({
        email: customerData.email,
        amount: 100, // ₦100 for card authorization only
        apiKey,
      });

      // Load Paystack in iframe
      setPaystackUrl(initData.authorization_url);
      setShowPaystackIframe(true);
      setLoading(false);

      // Poll for payment verification
      const verifyReference = initData.reference;
      const pollInterval = setInterval(async () => {
        try {
          const verifyData = await paymentService.verifyPayment(verifyReference, apiKey);
          
          if (verifyData.status === 'success') {
            clearInterval(pollInterval);
            setShowPaystackIframe(false);
            setLoading(true);

            const authorizationCode = verifyData.authorization?.authorization_code;

            if (!authorizationCode) {
              throw new Error('No authorization code received');
            }

            // Step 2: Initiate disbursement using service
            const disbursement = await checkoutService.initiateDisbursement({
              reference,
              reservationId,
              customerId,
              apiKey,
            });

            if (!disbursement || !disbursement.loanId) {
              throw new Error('Disbursement failed - no loan created');
            }

            // Step 3: Show success
            setStep('success');

            sendMessageToParent('success', {
              loanId: disbursement.loanId,
              loanAccountNumber: disbursement.loanAccountNumber,
              customerId,
              amount,
              plan: selectedPlan,
              repaymentSchedule,
              authorizationCode,
              reference,
              disbursementReference: disbursement.disbursementReference,
              customer: customerData,
              creditScore,
            });

            setLoading(false);

            setTimeout(() => {
              handleClose();
            }, 5000);
          }
        } catch (err: any) {
          // Continue polling on error
          console.log('Polling error:', err.message);
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setShowPaystackIframe(false);
        setLoading(false);
        setError('Card authorization timed out');
      }, 300000);
    } catch (err: any) {
      setError(err.message || 'Card authorization failed');
      sendMessageToParent('error', { message: err.message });
      setLoading(false);
    }
  };

  // Render different steps
  
  // Show loading state while checking if customer exists
  if (checkingCustomer) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center flex-shrink-0">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Checking customer information...</p>
          </div>
        </div>
      </div>
    );
  }

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

  // Show loading state (except during card authorization where we show iframe)
  if (loading && step !== 'card-authorization' && !showPaystackIframe) {
    const loadingMessages: Record<CheckoutStep, string> = {
      'customer-info': 'Processing your information...',
      'credit-check': 'Checking your eligibility...',
      'plan-selection': 'Loading financing plans...',
      'card-authorization': 'Processing...',
      'success': 'Finalizing your loan...',
    };
    const loadingMessage = loadingMessages[step] || 'Processing...';

    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center flex-shrink-0">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-xl font-semibold text-gray-800 mb-2">Please wait...</p>
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        </div>
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
                ₦100 will be charged to authorize your card for automatic payments. You can cancel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Paystack Iframe Modal */}
        {showPaystackIframe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md h-[600px] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-semibold text-gray-900">Card Authorization</h3>
                <button
                  onClick={() => setShowPaystackIframe(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <iframe
                src={paystackUrl}
                className="flex-1 w-full border-0"
                title="Paystack Payment"
              />
            </div>
          </div>
        )}

        {/* Sticky Footer Button */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleCardAuthorization}
              disabled={loading || showPaystackIframe}
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
