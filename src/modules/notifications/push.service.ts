import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send payment reminder push notification
   */
  async sendPaymentReminderPush(data: {
    deviceToken: string;
    customerName: string;
    amountDue: number;
    hoursRemaining: number;
  }): Promise<void> {
    try {
      await this.sendPushNotification(data.deviceToken, {
        title: 'Payment Reminder',
        body: `Your payment of ₦${data.amountDue.toLocaleString()} is due in ${data.hoursRemaining} hours`,
        data: {
          type: 'payment_reminder',
          amount: data.amountDue.toString(),
        },
      });

      this.logger.log(`Payment reminder push sent to device: ${data.deviceToken}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder push: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment success push notification
   */
  async sendPaymentSuccessPush(data: {
    deviceToken: string;
    customerName: string;
    amountPaid: number;
    remainingBalance?: number;
  }): Promise<void> {
    try {
      const body = data.remainingBalance && data.remainingBalance > 0
        ? `Payment of ₦${data.amountPaid.toLocaleString()} successful. Balance: ₦${data.remainingBalance.toLocaleString()}`
        : `Payment of ₦${data.amountPaid.toLocaleString()} successful. Loan fully paid!`;

      await this.sendPushNotification(data.deviceToken, {
        title: 'Payment Successful',
        body,
        data: {
          type: 'payment_success',
          amount: data.amountPaid.toString(),
        },
      });

      this.logger.log(`Payment success push sent to device: ${data.deviceToken}`);
    } catch (error) {
      this.logger.error(`Failed to send payment success push: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment failure push notification
   */
  async sendPaymentFailurePush(data: {
    deviceToken: string;
    customerName: string;
    amountDue: number;
    failureReason: string;
  }): Promise<void> {
    try {
      await this.sendPushNotification(data.deviceToken, {
        title: 'Payment Failed',
        body: `Payment of ₦${data.amountDue.toLocaleString()} failed. ${data.failureReason}`,
        data: {
          type: 'payment_failure',
          amount: data.amountDue.toString(),
          reason: data.failureReason,
        },
      });

      this.logger.log(`Payment failure push sent to device: ${data.deviceToken}`);
    } catch (error) {
      this.logger.error(`Failed to send payment failure push: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send overdue payment push notification
   */
  async sendOverduePaymentPush(data: {
    deviceToken: string;
    customerName: string;
    totalAmountDue: number;
    daysOverdue: number;
  }): Promise<void> {
    try {
      await this.sendPushNotification(data.deviceToken, {
        title: 'URGENT: Payment Overdue',
        body: `Your payment is ${data.daysOverdue} days overdue. Total: ₦${data.totalAmountDue.toLocaleString()}`,
        data: {
          type: 'payment_overdue',
          amount: data.totalAmountDue.toString(),
          daysOverdue: data.daysOverdue.toString(),
        },
      });

      this.logger.log(`Overdue payment push sent to device: ${data.deviceToken}`);
    } catch (error) {
      this.logger.error(`Failed to send overdue payment push: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send loan completion push notification
   */
  async sendLoanCompletionPush(data: {
    deviceToken: string;
    customerName: string;
    totalPaid: number;
  }): Promise<void> {
    try {
      await this.sendPushNotification(data.deviceToken, {
        title: 'Congratulations!',
        body: `You've fully repaid your loan of ₦${data.totalPaid.toLocaleString()}!`,
        data: {
          type: 'loan_completion',
          amount: data.totalPaid.toString(),
        },
      });

      this.logger.log(`Loan completion push sent to device: ${data.deviceToken}`);
    } catch (error) {
      this.logger.error(`Failed to send loan completion push: ${error.message}`);
      throw error;
    }
  }

  /**
   * Core push notification sending method
   * TODO: Integrate with Firebase Cloud Messaging (FCM) or similar
   */
  private async sendPushNotification(
    deviceToken: string,
    notification: { title: string; body: string; data?: any },
  ): Promise<void> {
    // TODO: Replace with actual push notification provider
    // Example for Firebase Cloud Messaging:
    // const message = {
    //   notification: {
    //     title: notification.title,
    //     body: notification.body,
    //   },
    //   data: notification.data,
    //   token: deviceToken,
    // };
    // await admin.messaging().send(message);

    this.logger.log(
      `Push notification would be sent to ${deviceToken}: ${notification.title} - ${notification.body}`,
    );
  }
}
