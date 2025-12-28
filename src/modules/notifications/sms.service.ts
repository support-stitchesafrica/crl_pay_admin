import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminderSms(data: {
    phoneNumber: string;
    customerName: string;
    amountDue: number;
    dueDate: string;
    hoursRemaining: number;
  }): Promise<void> {
    try {
      const message = `Dear ${data.customerName}, your payment of ₦${data.amountDue.toLocaleString()} is due in ${data.hoursRemaining} hours (${data.dueDate}). Please ensure sufficient funds for auto-debit. - CRL Pay`;

      await this.sendSms(data.phoneNumber, message);
      this.logger.log(`Payment reminder SMS sent to: ${data.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment success SMS
   */
  async sendPaymentSuccessSms(data: {
    phoneNumber: string;
    customerName: string;
    amountPaid: number;
    remainingBalance?: number;
  }): Promise<void> {
    try {
      let message = `Dear ${data.customerName}, your payment of ₦${data.amountPaid.toLocaleString()} was successful.`;

      if (data.remainingBalance && data.remainingBalance > 0) {
        message += ` Remaining balance: ₦${data.remainingBalance.toLocaleString()}.`;
      } else {
        message += ` Your loan is fully paid! Thank you.`;
      }

      message += ` - CRL Pay`;

      await this.sendSms(data.phoneNumber, message);
      this.logger.log(`Payment success SMS sent to: ${data.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send payment success SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment failure SMS
   */
  async sendPaymentFailureSms(data: {
    phoneNumber: string;
    customerName: string;
    amountDue: number;
    failureReason: string;
  }): Promise<void> {
    try {
      const message = `Dear ${data.customerName}, your payment of ₦${data.amountDue.toLocaleString()} failed. Reason: ${data.failureReason}. Please ensure sufficient funds. - CRL Pay`;

      await this.sendSms(data.phoneNumber, message);
      this.logger.log(`Payment failure SMS sent to: ${data.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send payment failure SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send overdue payment SMS
   */
  async sendOverduePaymentSms(data: {
    phoneNumber: string;
    customerName: string;
    totalAmountDue: number;
    daysOverdue: number;
  }): Promise<void> {
    try {
      const message = `URGENT: Dear ${data.customerName}, your payment is ${data.daysOverdue} days overdue. Total due: ₦${data.totalAmountDue.toLocaleString()} (incl. late fees). Please pay immediately to avoid further charges. - CRL Pay`;

      await this.sendSms(data.phoneNumber, message);
      this.logger.log(`Overdue payment SMS sent to: ${data.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send overdue payment SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send loan completion SMS
   */
  async sendLoanCompletionSms(data: {
    phoneNumber: string;
    customerName: string;
    totalPaid: number;
  }): Promise<void> {
    try {
      const message = `Congratulations ${data.customerName}! You've successfully completed your loan payment of ₦${data.totalPaid.toLocaleString()}. Your credit score has been positively impacted. Thank you! - CRL Pay`;

      await this.sendSms(data.phoneNumber, message);
      this.logger.log(`Loan completion SMS sent to: ${data.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send loan completion SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Core SMS sending method
   * TODO: Integrate with actual SMS provider (Twilio, Termii, etc.)
   */
  private async sendSms(phoneNumber: string, message: string): Promise<void> {
    const apiKey = this.configService.get('SMS_API_KEY');

    if (!apiKey || apiKey === 'your-sms-api-key') {
      this.logger.warn(`SMS not sent (no API key configured): ${phoneNumber} - ${message}`);
      return;
    }

    // TODO: Replace with actual SMS provider integration
    // Example for Termii:
    // const response = await axios.post('https://api.ng.termii.com/api/sms/send', {
    //   to: phoneNumber,
    //   from: 'CRL Pay',
    //   sms: message,
    //   type: 'plain',
    //   channel: 'generic',
    //   api_key: apiKey,
    // });

    this.logger.log(`SMS would be sent to ${phoneNumber}: ${message}`);
  }
}
