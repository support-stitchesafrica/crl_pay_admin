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

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly secretKey: string;

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
