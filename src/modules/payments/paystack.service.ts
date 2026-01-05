import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ChargeAuthorizationParams {
  email: string;
  amount: number; // in kobo (100 kobo = 1 NGN)
  authorizationCode: string;
  reference: string;
  metadata?: Record<string, any>;
}

export interface ChargeAuthorizationResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    transaction_date: string;
    status: string;
    reference: string;
    domain: string;
    metadata: any;
    gateway_response: string;
    message: string | null;
    channel: string;
    ip_address: string;
    log: any;
    fees: number;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
    };
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    log: any;
    fees: number;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

export interface CreateTransferRecipientParams {
  type: 'nuban';
  name: string;
  account_number: string;
  bank_code: string;
  currency: 'NGN';
}

export interface CreateTransferRecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string | null;
      bank_code: string;
      bank_name: string;
    };
  };
}

export interface InitiateTransferParams {
  source: 'balance';
  amount: number;
  recipient: string;
  reference: string;
  reason?: string;
}

export interface InitiateTransferResponse {
  status: boolean;
  message: string;
  data: {
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: string;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface VerifyTransferResponse {
  status: boolean;
  message: string;
  data: {
    integration: number;
    recipient: {
      domain: string;
      type: string;
      currency: string;
      name: string;
      details: {
        account_number: string;
        account_name: string | null;
        bank_code: string;
        bank_name: string;
      };
      recipient_code: string;
    };
    domain: string;
    amount: number;
    currency: string;
    source: string;
    source_details: any;
    reason: string;
    status: string;
    failures: any;
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
    titan_code: string | null;
    transferred_at: string | null;
    reference: string;
  };
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private axiosInstance: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';

    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Create a new instance with custom secret key (for multi-integration support)
   */
  static createWithSecretKey(secretKey: string): PaystackService {
    const instance = new PaystackService();
    instance.secretKey = secretKey;
    instance.axiosInstance = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return instance;
  }

  /**
   * Charge an authorization (auto-debit)
   * Used for recurring payments using a previously saved card
   */
  async chargeAuthorization(
    params: ChargeAuthorizationParams,
  ): Promise<ChargeAuthorizationResponse> {
    try {
      this.logger.log(`Charging authorization for reference: ${params.reference}`);

      const response = await this.axiosInstance.post<ChargeAuthorizationResponse>(
        '/transaction/charge_authorization',
        {
          email: params.email,
          amount: Math.round(params.amount), // Ensure integer (kobo)
          authorization_code: params.authorizationCode,
          reference: params.reference,
          metadata: params.metadata || {},
        },
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Payment charge failed',
        );
      }

      this.logger.log(
        `Charge successful for reference: ${params.reference}, status: ${response.data.data.status}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to charge authorization: ${error.message}`,
        error.stack,
      );

      // Paystack API errors
      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.message || 'Payment processing failed',
        );
      }

      throw error;
    }
  }

  /**
   * Verify a transaction by reference
   */
  async verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
    try {
      this.logger.log(`Verifying transaction: ${reference}`);

      const response = await this.axiosInstance.get<VerifyTransactionResponse>(
        `/transaction/verify/${reference}`,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Transaction verification failed',
        );
      }

      this.logger.log(
        `Transaction verified: ${reference}, status: ${response.data.data.status}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to verify transaction: ${error.message}`,
        error.stack,
      );

      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.message || 'Transaction verification failed',
        );
      }

      throw error;
    }
  }

  /**
   * Generate payment link for manual payment
   */
  async generatePaymentLink(params: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      this.logger.log(`Generating payment link for reference: ${params.reference}`);

      // Paystack doesn't have a specific "payment link" endpoint for this use case
      // Instead, we use the transaction initialize endpoint
      const response = await this.axiosInstance.post('/transaction/initialize', {
        email: params.email,
        amount: Math.round(params.amount),
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata || {},
      });

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to generate payment link',
        );
      }

      const paymentUrl = response.data.data.authorization_url;
      this.logger.log(`Payment link generated: ${paymentUrl}`);

      return paymentUrl;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate payment link: ${error.message}`,
        error.stack,
      );

      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.message || 'Failed to generate payment link',
        );
      }

      throw error;
    }
  }

  /**
   * Create transfer recipient
   */
  async createTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<CreateTransferRecipientResponse> {
    try {
      this.logger.log(
        `Creating transfer recipient: ${params.name} - ${params.account_number}`,
      );

      const response = await this.axiosInstance.post<CreateTransferRecipientResponse>(
        '/transferrecipient',
        params,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to create transfer recipient',
        );
      }

      this.logger.log(
        `Transfer recipient created: ${response.data.data.recipient_code}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to create transfer recipient: ${error.message}`,
        error.stack,
      );

      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.message || 'Failed to create transfer recipient',
        );
      }

      throw error;
    }
  }

  /**
   * Initiate transfer (disbursement)
   */
  async initiateTransfer(
    params: InitiateTransferParams,
  ): Promise<InitiateTransferResponse> {
    try {
      this.logger.log(
        `Initiating transfer: ${params.reference}, amount: ${params.amount / 100} NGN`,
      );

      const response = await this.axiosInstance.post<InitiateTransferResponse>(
        '/transfer',
        params,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to initiate transfer',
        );
      }

      this.logger.log(
        `Transfer initiated: ${response.data.data.transfer_code}, status: ${response.data.data.status}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to initiate transfer: ${error.message}`,
        error.stack,
      );

      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.message || 'Failed to initiate transfer',
        );
      }

      throw error;
    }
  }

  /**
   * Verify transfer status
   */
  async verifyTransfer(reference: string): Promise<VerifyTransferResponse> {
    try {
      this.logger.log(`Verifying transfer: ${reference}`);

      const response = await this.axiosInstance.get<VerifyTransferResponse>(
        `/transfer/verify/${reference}`,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Transfer verification failed',
        );
      }

      this.logger.log(
        `Transfer verified: ${reference}, status: ${response.data.data.status}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to verify transfer: ${error.message}`,
        error.stack,
      );

      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.message || 'Transfer verification failed',
        );
      }

      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}
