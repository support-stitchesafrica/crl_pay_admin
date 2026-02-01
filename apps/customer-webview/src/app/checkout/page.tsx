'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  checkoutService,
  customerService,
  creditService,
  paymentService,
} from '../../services';

type CheckoutStep = 'customer-info' | 'terms-review' | 'credit-check' | 'card-authorization' | 'success';

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

interface AllocationTerms {
  interestRate: number;
  tenure: number;
  tenurePeriod: string;
  penalty: {
    type: string;
    amount: number;
    gracePeriodDays: number;
  };
  minLoanAmount?: number;
  maxLoanAmount?: number;
}

interface RepaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<CheckoutStep>('customer-info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merchant and order info from URL params
  const amount = parseFloat(searchParams.get('amount') || '0');
  const customerEmail = searchParams.get('email') || '';
  const reference = searchParams.get('reference') || '';
  const apiKey = searchParams.get('apiKey') || '';

  const [merchantId, setMerchantId] = useState<string>('');
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

  const [allocationTerms, setAllocationTerms] = useState<AllocationTerms | null>(null);
  const [allocationId, setAllocationId] = useState<string>('');
  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentScheduleItem[]>([]);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(0);
  const [customerId, setCustomerId] = useState<string>('');
  const [creditScore, setCreditScore] = useState<number>(0);
  const [creditTier, setCreditTier] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('silver');
  const [countdown, setCountdown] = useState(5);
  const [checkingCustomer, setCheckingCustomer] = useState(true);
  const [paystackUrl, setPaystackUrl] = useState<string>('');
  const [showPaystackIframe, setShowPaystackIframe] = useState(false);

  useEffect(() => {
    // Fetch merchant ID from API key
    const fetchMerchantId = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1'}/merchants/by-api-key`, {
          headers: {
            'X-API-Key': apiKey,
          },
        });

        if (response.ok) {
          const result = await response.json();
          const merchant = result.data;
          const fetchedMerchantId = merchant.merchantId;
          setMerchantId(fetchedMerchantId);
          sendMessageToParent('ready', { merchantId: fetchedMerchantId, amount, reference });

          // Now that we have merchantId, check for existing customer
          if (customerEmail) {
            checkExistingCustomer(customerEmail, fetchedMerchantId);
          } else {
            setCheckingCustomer(false);
          }
        } else {
          setError('Invalid API key');
          setCheckingCustomer(false);
        }
      } catch (err) {
        setError('Failed to validate merchant');
        setCheckingCustomer(false);
      }
    };

    if (apiKey) {
      fetchMerchantId();
    } else {
      setError('API key is required');
      setCheckingCustomer(false);
    }
  }, []);

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

  const checkExistingCustomer = async (email: string, merchantIdParam: string) => {
    setCheckingCustomer(true);
    try {
      const customer = await customerService.getByEmail(email, apiKey);

      if (customer) {
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

        await performCreditAssessment(customer.customerId, merchantIdParam);
      } else {
        setCheckingCustomer(false);
      }
    } catch (err) {
      setCheckingCustomer(false);
    }
  };

  const performCreditAssessment = async (userId: string, merchantIdParam: string) => {
    setCheckingCustomer(false);
    setLoading(true);
    setError(null);
    setStep('credit-check');

    try {
      console.log('Starting credit assessment for user:', userId);
      console.log('Merchant ID:', merchantIdParam);
      
      const creditData = await creditService.assessCredit({
        customerId: userId,
        merchantId: merchantIdParam,
        requestedAmount: amount,
        apiKey,
      });

      console.log('Credit assessment result:', creditData);
      setCreditScore(creditData.totalScore || 0);
      setCreditTier(creditData.creditTier || 'silver');

      const isApproved = ['instant_approval', 'conditional_approval', 'manual_review'].includes(creditData.decision);
      
      if (isApproved) {
        console.log('Credit approved, checking eligibility...');
        sendMessageToParent('credit_approved', creditData);

        await checkEligibilityAndTerms(userId, merchantIdParam);
        
        try {
          const customer = await customerService.getById(userId, apiKey);
          
          if (customer?.paystackAuthorizationCode) {
            setCustomerData(prev => ({
              ...prev,
              hasSavedCard: true,
              savedAuthorizationCode: customer.paystackAuthorizationCode,
              cardType: customer.cardType,
              cardLast4: customer.cardLast4,
              cardBank: customer.cardBank,
            }));
          }
        } catch (err) {
          console.log('Could not check for saved card:', err);
        }
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
      if (!merchantId) {
        setError('Merchant ID not available. Please refresh and try again.');
        setLoading(false);
        return;
      }

      const customer = await customerService.create({
        merchantId,
        ...customerData,
      }, apiKey);

      setCustomerId(customer.customerId);
      sendMessageToParent('customer_registered', customer);

      await performCreditAssessment(customer.customerId, merchantId);
    } catch (err: any) {
      setError(err.message || 'Failed to register customer');
      sendMessageToParent('error', { message: err.message });
      setLoading(false);
    }
  };

  const checkEligibilityAndTerms = async (userIdParam?: string, merchantIdParam?: string) => {
    try {
      const effectiveCustomerId = userIdParam || customerId;
      const effectiveMerchantId = merchantIdParam || merchantId;
      
      console.log('checkEligibilityAndTerms called');
      console.log('customerId:', effectiveCustomerId);
      console.log('merchantId:', effectiveMerchantId);
      
      setLoading(true);
      
      if (!effectiveCustomerId) {
        console.error('No customerId available');
        setError('Customer ID is required. Please register first.');
        setLoading(false);
        return;
      }
      
      if (!effectiveMerchantId) {
        console.error('No merchantId available');
        setError('Merchant ID not available. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Calling eligibility check API...');
      const eligibility = await checkoutService.checkEligibility({
        merchantId: effectiveMerchantId,
        amount,
        apiKey,
        customerId: effectiveCustomerId,
      });

      console.log('Eligibility result:', eligibility);

      if (!eligibility.eligible || !eligibility.allocationId) {
        console.error('Eligibility check failed:', eligibility.reason);
        setError(eligibility.reason || 'No financing available');
        setStep('customer-info');
        return;
      }

      console.log('Eligibility passed');
      setAllocationId(eligibility.allocationId);
      
      // For now, use default terms for display
      // The actual loan will be created with correct terms from allocation in the backend
      const defaultTenure = 6; // months
      const defaultTenurePeriod = 'months';
      
      // Get credit config to calculate interest based on tier for display
      const configResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1'}/credit-config/active`, {
        headers: { 'X-API-Key': apiKey }
      });
      const configData = await configResponse.json();
      const interestRate = configData.data.interestRates[creditTier];
      const interestPerPeriod = interestRate / 100;
      const totalInterest = Math.ceil(amount * interestPerPeriod * defaultTenure);
      const total = amount + totalInterest;
      const installment = Math.ceil(total / defaultTenure);
      
      setNumberOfInstallments(defaultTenure);
      setTotalAmount(total);
      setInstallmentAmount(installment);
      
      // Create simple schedule for display
      const schedule: RepaymentScheduleItem[] = [];
      for (let i = 1; i <= defaultTenure; i++) {
        schedule.push({
          installmentNumber: i,
          dueDate: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: installment,
          principal: Math.ceil(amount / defaultTenure),
          interest: Math.ceil(totalInterest / defaultTenure),
        });
      }
      setRepaymentSchedule(schedule);
      
      setStep('terms-review');
    } catch (err: any) {
      setError(err.message || 'Failed to load financing terms');
      setStep('customer-info');
    } finally {
      setLoading(false);
    }
  };

  const calculateRepaymentSchedule = (
    terms: AllocationTerms,
    installment: number,
    numInstallments: number,
    principal: number,
    totalInterest: number
  ): RepaymentScheduleItem[] => {
    const schedule: RepaymentScheduleItem[] = [];
    const today = new Date();
    
    let startDate = new Date(today);
    startDate.setDate(today.getDate() + terms.penalty.gracePeriodDays);
    
    const intervalDays = 
      terms.tenurePeriod === 'days' ? 1 :
      terms.tenurePeriod === 'weeks' ? 7 : 30;
    
    // Calculate principal and interest per payment
    const principalPerPayment = Math.floor(principal / numInstallments);
    const interestPerPayment = Math.floor(totalInterest / numInstallments);
    
    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(startDate.getDate() + (intervalDays * (i + 1)));
      
      // For the last payment, add any remaining amount to avoid rounding issues
      const isLastPayment = i === numInstallments - 1;
      const principalAmount = isLastPayment 
        ? principal - (principalPerPayment * (numInstallments - 1))
        : principalPerPayment;
      const interestAmount = isLastPayment
        ? totalInterest - (interestPerPayment * (numInstallments - 1))
        : interestPerPayment;
      
      schedule.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: principalAmount + interestAmount,
        principal: principalAmount,
        interest: interestAmount,
      });
    }
    
    return schedule;
  };

  const handleConfirmTerms = async () => {
    setError(null);
    setLoading(true);

    try {
      // If customer has saved card, create reservation and disburse immediately
      if (customerData.hasSavedCard && customerData.savedAuthorizationCode) {
        setStep('credit-check');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create reservation right before disbursement
        // Use a unique reference to avoid idempotency issues
        const reservationReference = `${reference}_${Date.now()}`;
        const reservation = await checkoutService.reserveAllocation({
          reference: reservationReference,
          amount,
          customerId,
          creditTier,
          apiKey,
        });

        const disbursement = await checkoutService.initiateDisbursement({
          reference,
          reservationId: reservation.reservationId,
          customerId,
          apiKey,
        });

        if (!disbursement || !disbursement.loanId) {
          throw new Error('Disbursement failed - no loan created');
        }

        setStep('success');
        sendMessageToParent('success', {
          loanId: disbursement.loanId,
          loanAccountNumber: disbursement.loanAccountNumber,
          customerId,
          amount,
          allocationTerms,
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
        // For new cards, just move to card authorization step
        // Reservation will be created after card authorization succeeds
        setStep('card-authorization');
        sendMessageToParent('terms_confirmed', { amount, allocationTerms, repaymentSchedule });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setStep('terms-review');
      sendMessageToParent('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCardAuthorization = async () => {
    console.log('🔵 handleCardAuthorization called');
    console.log('Customer email:', customerData.email);
    console.log('API Key:', apiKey ? 'Present' : 'Missing');
    console.log('Customer ID:', customerId);
    
    setLoading(true);
    setError(null);

    try {
      console.log('Initializing Paystack authorization...');
      const initData = await paymentService.initializeAuthorization({
        email: customerData.email,
        amount: 100,
        apiKey,
      });

      console.log('Paystack initialization response:', initData);
      
      // Handle both camelCase and snake_case from API
      const authUrl = (initData as any).authorizationUrl || initData.authorization_url;
      console.log('Authorization URL:', authUrl);

      if (!authUrl) {
        throw new Error('No authorization URL received from Paystack');
      }

      setPaystackUrl(authUrl);
      setShowPaystackIframe(true);
      setLoading(false);

      console.log('Paystack iframe should now be visible');
      console.log('Starting payment verification polling...');

      const verifyReference = initData.reference;
      const pollInterval = setInterval(async () => {
        try {
          console.log('Polling payment status for reference:', verifyReference);
          const verifyData = await paymentService.verifyPayment(verifyReference, apiKey);
          console.log('Verification response:', verifyData);
          
          if (verifyData.status === 'success') {
            console.log('✅ Payment verified successfully!');
            clearInterval(pollInterval);
            setShowPaystackIframe(false);
            setLoading(true);

            const authorizationCode = verifyData.authorization?.authorization_code;
            console.log('Authorization code:', authorizationCode);

            if (!authorizationCode) {
              throw new Error('No authorization code received');
            }

            // Create reservation right before disbursement to avoid expiry
            console.log('Creating reservation...');
            const reservation = await checkoutService.reserveAllocation({
              reference,
              amount,
              customerId,
              creditTier,
              apiKey,
            });
            console.log('Reservation created:', reservation.reservationId);

            console.log('Initiating disbursement...');
            const disbursement = await checkoutService.initiateDisbursement({
              reference,
              reservationId: reservation.reservationId,
              customerId,
              apiKey,
            });

            console.log('Disbursement response:', disbursement);

            if (!disbursement || !disbursement.loanId) {
              throw new Error('Disbursement failed - no loan created');
            }

            console.log('✅ Loan created successfully:', disbursement.loanId);
            setStep('success');

            sendMessageToParent('success', {
              loanId: disbursement.loanId,
              loanAccountNumber: disbursement.loanAccountNumber,
              customerId,
              amount,
              allocationTerms,
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
          console.log('Polling error:', err.message);
        }
      }, 3000);

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
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center flex-shrink-0">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                  maxLength={11}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Required for identity verification</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={customerData.dateOfBirth}
                  onChange={(e) => setCustomerData({ ...customerData, dateOfBirth: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                <input
                  type="text"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Lagos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">State</label>
                  <select
                    value={customerData.state}
                    onChange={(e) => setCustomerData({ ...customerData, state: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              type="submit"
              form="customer-info-form"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:bg-gray-400 flex items-center justify-center hover:bg-blue-700"
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

  if (step === 'credit-check') {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
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
            <p className="text-gray-600">Performing credit assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'terms-review') {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Review Payment Terms</h2>
            <p className="text-sm text-gray-600 mb-4">Step 2 of 3</p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-1">Purchase Amount</p>
              <p className="text-3xl font-bold text-gray-900">₦{amount.toLocaleString()}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-gray-900 mb-3">Payment Terms</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Credit Tier:</span>
                  <span className="font-semibold text-gray-900 capitalize">{creditTier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Interest Rate:</span>
                  <span className="font-semibold text-gray-900">{((totalAmount - amount) / amount / numberOfInstallments * 100).toFixed(1)}% per month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Duration:</span>
                  <span className="font-semibold text-gray-900">{numberOfInstallments} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Number of Payments:</span>
                  <span className="font-semibold text-gray-900">{numberOfInstallments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Payment Frequency:</span>
                  <span className="font-semibold text-gray-900">Monthly</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-700">Total Interest:</span>
                  <span className="font-semibold text-gray-900">₦{(totalAmount - amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Installment Amount:</span>
                  <span className="font-bold text-lg text-gray-900">₦{installmentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Total Repayment:</span>
                  <span className="font-bold text-lg text-blue-600">₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Repayment Schedule</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {repaymentSchedule.map((item) => (
                  <div key={item.installmentNumber} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Payment {item.installmentNumber} of {numberOfInstallments}</p>
                        <p className="text-xs text-gray-600 mt-1">Due: {new Date(item.dueDate).toLocaleDateString('en-NG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                      </div>
                      <p className="font-bold text-lg text-blue-600">₦{item.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-gray-300">
                      <div>
                        <span className="text-gray-600">Principal: </span>
                        <span className="font-semibold text-gray-900">₦{item.principal.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Interest: </span>
                        <span className="font-semibold text-gray-900">₦{item.interest.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 bg-white border-t p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleConfirmTerms}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:bg-gray-400 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Confirm & Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'card-authorization') {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-blue-600 text-white py-3 px-4 flex justify-between items-center">
          <div className="font-bold text-lg">CRL Pay Checkout</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Card Authorization</h2>
            <p className="text-sm text-gray-600 mb-4">Step 3 of 3</p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                We need to authorize your card for automatic repayments. A small amount (₦100) will be charged and immediately refunded.
              </p>
            </div>

            {customerData.hasSavedCard ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-gray-900 mb-3">Saved Card</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{customerData.cardType || 'Card'} •••• {customerData.cardLast4}</p>
                    <p className="text-xs text-gray-600">{customerData.cardBank}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Paystack Iframe Modal */}
        {showPaystackIframe && paystackUrl && (
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

        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => {
                console.log('🔘 Authorize Card button clicked');
                handleCardAuthorization();
              }}
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
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-green-600 text-white py-3 px-4 flex justify-between items-center">
          <div className="font-bold text-lg">Payment Successful!</div>
          <button onClick={handleClose} className="text-white hover:text-gray-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Approved!</h2>
              <p className="text-gray-600">Your BNPL loan has been created successfully.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Financed:</span>
                  <span className="font-medium">₦{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Repayment:</span>
                  <span className="font-medium">₦{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Payment:</span>
                  <span className="font-medium">₦{installmentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of Payments:</span>
                  <span className="font-medium">{numberOfInstallments}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Closing in {countdown} seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
