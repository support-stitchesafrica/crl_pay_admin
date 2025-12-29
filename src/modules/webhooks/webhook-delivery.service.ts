import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import {
  Webhook,
  WebhookDelivery,
  WebhookEvent,
  WebhookPayload,
} from '../../entities/webhook.entity';
import { WebhooksService } from './webhooks.service';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private readonly TIMEOUT_MS = 30000; // 30 second timeout

  constructor(private webhooksService: WebhooksService) {}

  /**
   * Publish an event to all subscribed webhooks for a merchant
   */
  async publishEvent(
    merchantId: string,
    event: WebhookEvent,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      const webhooks = await this.webhooksService.getWebhooksForEvent(merchantId, event);

      if (webhooks.length === 0) {
        this.logger.debug(`No webhooks subscribed to ${event} for merchant ${merchantId}`);
        return;
      }

      // Create deliveries and attempt immediate delivery for each webhook
      for (const webhook of webhooks) {
        await this.createAndDeliverWebhook(webhook, event, data);
      }
    } catch (error) {
      this.logger.error(`Failed to publish event ${event}: ${error.message}`);
    }
  }

  /**
   * Create a delivery record and attempt immediate delivery
   */
  private async createAndDeliverWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      const delivery = await this.webhooksService.createDelivery(webhook, event, data);
      await this.deliverWebhook(webhook, delivery, data);
    } catch (error) {
      this.logger.error(`Failed to create/deliver webhook: ${error.message}`);
    }
  }

  /**
   * Deliver a webhook to the merchant's endpoint
   */
  async deliverWebhook(
    webhook: Webhook,
    delivery: WebhookDelivery,
    data?: Record<string, any>,
  ): Promise<boolean> {
    const payload: WebhookPayload = {
      event: delivery.event,
      timestamp: new Date().toISOString(),
      data: data || delivery.payload,
      webhookId: webhook.webhookId,
      deliveryId: delivery.deliveryId,
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.webhooksService.generateSignature(payloadString, webhook.secret);

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-CRLPay-Signature': signature,
          'X-CRLPay-Event': delivery.event,
          'X-CRLPay-Delivery-ID': delivery.deliveryId,
          'X-CRLPay-Webhook-ID': webhook.webhookId,
          'User-Agent': 'CRLPay-Webhook/1.0',
        },
        timeout: this.TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      await this.webhooksService.updateDeliveryStatus(
        delivery.deliveryId,
        true,
        response.status,
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      );

      this.logger.log(`Webhook delivered successfully: ${delivery.deliveryId} to ${webhook.url}`);
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      const httpStatusCode = axiosError.response?.status;
      const responseBody = axiosError.response?.data
        ? typeof axiosError.response.data === 'string'
          ? axiosError.response.data
          : JSON.stringify(axiosError.response.data)
        : undefined;
      const errorMessage = axiosError.message;

      await this.webhooksService.updateDeliveryStatus(
        delivery.deliveryId,
        false,
        httpStatusCode,
        responseBody,
        errorMessage,
      );

      this.logger.warn(
        `Webhook delivery failed: ${delivery.deliveryId} to ${webhook.url} - ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * Send a test webhook to verify endpoint
   */
  async sendTestWebhook(webhook: Webhook, event: WebhookEvent): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    const testPayload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook from CRL Pay',
        event,
      },
      webhookId: webhook.webhookId,
      deliveryId: `test_${Date.now()}`,
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = this.webhooksService.generateSignature(payloadString, webhook.secret);

    try {
      const response = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-CRLPay-Signature': signature,
          'X-CRLPay-Event': event,
          'X-CRLPay-Test': 'true',
          'User-Agent': 'CRLPay-Webhook/1.0',
        },
        timeout: this.TIMEOUT_MS,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return { success: true, statusCode: response.status };
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        statusCode: axiosError.response?.status,
        error: axiosError.message,
      };
    }
  }

  /**
   * Process pending webhook deliveries (retry failed ones)
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processRetries(): Promise<void> {
    this.logger.debug('Processing webhook retries...');

    try {
      const pendingDeliveries = await this.webhooksService.getPendingDeliveries();

      if (pendingDeliveries.length === 0) {
        return;
      }

      this.logger.log(`Processing ${pendingDeliveries.length} pending webhook deliveries`);

      for (const delivery of pendingDeliveries) {
        try {
          // Get the webhook configuration
          const webhookDoc = await this.getWebhookById(delivery.webhookId);
          if (!webhookDoc || !webhookDoc.isActive) {
            continue;
          }

          await this.deliverWebhook(webhookDoc, delivery);
        } catch (error) {
          this.logger.error(`Failed to retry delivery ${delivery.deliveryId}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process webhook retries: ${error.message}`);
    }
  }

  /**
   * Get webhook by ID (internal helper)
   */
  private async getWebhookById(webhookId: string): Promise<Webhook | null> {
    return this.webhooksService.getWebhookById(webhookId);
  }
}
