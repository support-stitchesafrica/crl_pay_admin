import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import * as crypto from 'crypto';
import {
  Webhook,
  WebhookDelivery,
  WebhookEvent,
  WEBHOOK_RETRY_DELAYS,
  MAX_WEBHOOK_RETRIES,
  MAX_CONSECUTIVE_FAILURES,
} from '../../entities/webhook.entity';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/create-webhook.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private webhooksCollection: FirebaseFirestore.CollectionReference;
  private deliveriesCollection: FirebaseFirestore.CollectionReference;

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.webhooksCollection = this.firestore.collection('crl_webhooks');
    this.deliveriesCollection = this.firestore.collection('crl_webhook_deliveries');
  }

  /**
   * Generate a secure webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash the webhook secret for storage
   */
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Create a new webhook subscription
   */
  async create(merchantId: string, createWebhookDto: CreateWebhookDto): Promise<{ webhook: Webhook; secret: string }> {
    // Check if merchant already has a webhook with this URL
    const existingSnapshot = await this.webhooksCollection
      .where('merchantId', '==', merchantId)
      .where('url', '==', createWebhookDto.url)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      throw new BadRequestException('A webhook with this URL already exists');
    }

    const webhookId = uuidv4();
    const rawSecret = this.generateSecret();
    const hashedSecret = this.hashSecret(rawSecret);
    const now = new Date();

    const webhook: Webhook = {
      webhookId,
      merchantId,
      url: createWebhookDto.url,
      secret: hashedSecret,
      events: createWebhookDto.events,
      isActive: createWebhookDto.isActive ?? true,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.webhooksCollection.doc(webhookId).set(webhook);
    this.logger.log(`Webhook created: ${webhookId} for merchant: ${merchantId}`);

    // Return the raw secret only once (merchant must save it)
    return { webhook, secret: rawSecret };
  }

  /**
   * Find all webhooks for a merchant
   */
  async findAllByMerchant(merchantId: string): Promise<Webhook[]> {
    const snapshot = await this.webhooksCollection
      .where('merchantId', '==', merchantId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.docToWebhook(doc));
  }

  /**
   * Find one webhook by ID
   */
  async findOne(webhookId: string, merchantId: string): Promise<Webhook> {
    const doc = await this.webhooksCollection.doc(webhookId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }

    const webhook = this.docToWebhook(doc);

    if (webhook.merchantId !== merchantId) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }

    return webhook;
  }

  /**
   * Update a webhook
   */
  async update(webhookId: string, merchantId: string, updateWebhookDto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.findOne(webhookId, merchantId);

    const updatedData: Partial<Webhook> = {
      ...updateWebhookDto,
      updatedAt: new Date(),
    };

    await this.webhooksCollection.doc(webhookId).update(updatedData);
    this.logger.log(`Webhook updated: ${webhookId}`);

    return { ...webhook, ...updatedData } as Webhook;
  }

  /**
   * Delete a webhook
   */
  async remove(webhookId: string, merchantId: string): Promise<void> {
    await this.findOne(webhookId, merchantId); // Verify ownership
    await this.webhooksCollection.doc(webhookId).delete();
    this.logger.log(`Webhook deleted: ${webhookId}`);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: string, merchantId: string): Promise<{ webhook: Webhook; secret: string }> {
    const webhook = await this.findOne(webhookId, merchantId);

    const rawSecret = this.generateSecret();
    const hashedSecret = this.hashSecret(rawSecret);

    await this.webhooksCollection.doc(webhookId).update({
      secret: hashedSecret,
      updatedAt: new Date(),
    });

    this.logger.log(`Webhook secret regenerated: ${webhookId}`);

    return {
      webhook: { ...webhook, secret: hashedSecret, updatedAt: new Date() },
      secret: rawSecret,
    };
  }

  /**
   * Get webhooks subscribed to a specific event for a merchant
   */
  async getWebhooksForEvent(merchantId: string, event: WebhookEvent): Promise<Webhook[]> {
    const snapshot = await this.webhooksCollection
      .where('merchantId', '==', merchantId)
      .where('isActive', '==', true)
      .where('events', 'array-contains', event)
      .get();

    return snapshot.docs.map((doc) => this.docToWebhook(doc));
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(
    webhookId: string,
    merchantId: string,
    filters?: { status?: string; limit?: number },
  ): Promise<WebhookDelivery[]> {
    await this.findOne(webhookId, merchantId); // Verify ownership

    let query: FirebaseFirestore.Query = this.deliveriesCollection.where('webhookId', '==', webhookId);

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    query = query.orderBy('createdAt', 'desc');

    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => this.docToDelivery(doc));
  }

  /**
   * Create a delivery record
   */
  async createDelivery(
    webhook: Webhook,
    event: WebhookEvent,
    payload: Record<string, any>,
  ): Promise<WebhookDelivery> {
    const deliveryId = uuidv4();
    const now = new Date();

    const delivery: WebhookDelivery = {
      deliveryId,
      webhookId: webhook.webhookId,
      merchantId: webhook.merchantId,
      event,
      payload,
      status: 'pending',
      attemptCount: 0,
      maxRetries: MAX_WEBHOOK_RETRIES,
      createdAt: now,
      updatedAt: now,
    };

    await this.deliveriesCollection.doc(deliveryId).set(delivery);

    return delivery;
  }

  /**
   * Update delivery status after attempt
   */
  async updateDeliveryStatus(
    deliveryId: string,
    success: boolean,
    httpStatusCode?: number,
    responseBody?: string,
    errorMessage?: string,
  ): Promise<void> {
    const doc = await this.deliveriesCollection.doc(deliveryId).get();
    if (!doc.exists) return;

    const delivery = this.docToDelivery(doc);
    const attemptCount = delivery.attemptCount + 1;
    const now = new Date();

    const updateData: Partial<WebhookDelivery> = {
      attemptCount,
      httpStatusCode,
      responseBody: responseBody?.substring(0, 1000), // Truncate response
      errorMessage,
      updatedAt: now,
    };

    if (success) {
      updateData.status = 'success';
      updateData.deliveredAt = now;
    } else if (attemptCount >= MAX_WEBHOOK_RETRIES) {
      updateData.status = 'failed';
    } else {
      // Schedule retry
      const retryDelay = WEBHOOK_RETRY_DELAYS[attemptCount] || WEBHOOK_RETRY_DELAYS[WEBHOOK_RETRY_DELAYS.length - 1];
      updateData.nextRetryAt = new Date(now.getTime() + retryDelay);
    }

    await this.deliveriesCollection.doc(deliveryId).update(updateData);

    // Update webhook health metrics
    await this.updateWebhookHealth(delivery.webhookId, success, errorMessage);
  }

  /**
   * Update webhook health metrics
   */
  private async updateWebhookHealth(webhookId: string, success: boolean, errorMessage?: string): Promise<void> {
    const doc = await this.webhooksCollection.doc(webhookId).get();
    if (!doc.exists) return;

    const webhook = this.docToWebhook(doc);
    const now = new Date();

    const updateData: Partial<Webhook> = {
      updatedAt: now,
    };

    if (success) {
      updateData.consecutiveFailures = 0;
      updateData.lastSuccessAt = now;
    } else {
      updateData.consecutiveFailures = webhook.consecutiveFailures + 1;
      updateData.lastFailureAt = now;
      updateData.lastFailureReason = errorMessage;

      // Disable webhook after too many consecutive failures
      if (updateData.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        updateData.isActive = false;
        this.logger.warn(`Webhook ${webhookId} disabled due to ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      }
    }

    await this.webhooksCollection.doc(webhookId).update(updateData);
  }

  /**
   * Get pending deliveries for retry
   * Note: Using single field query + in-memory filter to avoid composite index requirement
   */
  async getPendingDeliveries(): Promise<WebhookDelivery[]> {
    const now = new Date();

    // Query only by status to avoid composite index requirement
    const snapshot = await this.deliveriesCollection
      .where('status', '==', 'pending')
      .limit(500)
      .get();

    // Filter by nextRetryAt in memory
    const deliveries = snapshot.docs
      .map((doc) => this.docToDelivery(doc))
      .filter((delivery) => {
        // Include deliveries that have a nextRetryAt in the past, or no nextRetryAt (first attempt)
        if (!delivery.nextRetryAt) return true;
        return delivery.nextRetryAt <= now;
      })
      .slice(0, 100); // Limit to 100 for processing

    return deliveries;
  }

  /**
   * Get webhook by ID (internal use, no merchant check)
   */
  async getWebhookById(webhookId: string): Promise<Webhook | null> {
    const doc = await this.webhooksCollection.doc(webhookId).get();
    if (!doc.exists) return null;
    return this.docToWebhook(doc);
  }

  /**
   * Convert Firestore document to Webhook
   */
  private docToWebhook(doc: FirebaseFirestore.DocumentSnapshot): Webhook {
    const data = doc.data() as any;
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      lastSuccessAt: data.lastSuccessAt?.toDate ? data.lastSuccessAt.toDate() : data.lastSuccessAt,
      lastFailureAt: data.lastFailureAt?.toDate ? data.lastFailureAt.toDate() : data.lastFailureAt,
    } as Webhook;
  }

  /**
   * Convert Firestore document to WebhookDelivery
   */
  private docToDelivery(doc: FirebaseFirestore.DocumentSnapshot): WebhookDelivery {
    const data = doc.data() as any;
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      deliveredAt: data.deliveredAt?.toDate ? data.deliveredAt.toDate() : data.deliveredAt,
      nextRetryAt: data.nextRetryAt?.toDate ? data.nextRetryAt.toDate() : data.nextRetryAt,
    } as WebhookDelivery;
  }
}
