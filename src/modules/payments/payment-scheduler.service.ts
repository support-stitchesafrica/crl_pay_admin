import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentSchedulerService {
  private readonly logger = new Logger(PaymentSchedulerService.name);

  constructor(private paymentsService: PaymentsService) {}

  /**
   * Process pending retries every hour
   * Runs at the start of every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processRetries() {
    this.logger.log('Starting scheduled retry processing...');

    try {
      const pendingRetries = await this.paymentsService.getPendingRetries();

      if (pendingRetries.length === 0) {
        this.logger.log('No pending retries found');
        return;
      }

      this.logger.log(`Found ${pendingRetries.length} pending retries`);

      for (const payment of pendingRetries) {
        try {
          this.logger.log(`Retrying payment: ${payment.paymentId}`);
          await this.paymentsService.retry(payment.paymentId);
        } catch (error) {
          this.logger.error(
            `Failed to retry payment ${payment.paymentId}: ${error.message}`,
          );
          // Continue with other payments even if one fails
        }
      }

      this.logger.log('Completed scheduled retry processing');
    } catch (error) {
      this.logger.error(`Retry processing failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Log scheduled payment statistics daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async logDailyStats() {
    this.logger.log('Generating daily payment statistics...');

    try {
      const stats = await this.paymentsService.getStats({});

      this.logger.log(`
        Daily Payment Statistics:
        - Total Payments: ${stats.totalPayments}
        - Successful: ${stats.successfulPayments}
        - Failed: ${stats.failedPayments}
        - Pending: ${stats.pendingPayments}
        - Total Amount: ₦${stats.totalAmount.toLocaleString()}
        - Successful Amount: ₦${stats.successfulAmount.toLocaleString()}
        - Failed Amount: ₦${stats.failedAmount.toLocaleString()}
      `);
    } catch (error) {
      this.logger.error(`Failed to generate daily stats: ${error.message}`);
    }
  }
}
