import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';

/**
 * Main notifications orchestration service
 * Coordinates multi-channel notifications (Email, SMS, Push)
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushService,
  ) {}

  /**
   * Send merchant registration notifications
   */
  async sendMerchantRegistrationEmail(merchantEmail: string, merchantName: string): Promise<void> {
    return this.emailService.sendMerchantRegistrationEmail(merchantEmail, merchantName);
  }

  /**
   * Send login notification to admin
   */
  async sendLoginNotificationToAdmin(
    userType: 'merchant' | 'admin',
    email: string,
    name: string,
    ipAddress?: string,
  ): Promise<void> {
    return this.emailService.sendLoginNotificationToAdmin(userType, email, name, ipAddress);
  }

  /**
   * Send merchant approval email
   */
  async sendMerchantApprovalEmail(
    merchantEmail: string,
    merchantName: string,
    notes?: string,
  ): Promise<void> {
    return this.emailService.sendMerchantApprovalEmail(merchantEmail, merchantName, notes);
  }

  /**
   * Send merchant rejection email
   */
  async sendMerchantRejectionEmail(
    merchantEmail: string,
    merchantName: string,
    reason?: string,
  ): Promise<void> {
    return this.emailService.sendMerchantRejectionEmail(merchantEmail, merchantName, reason);
  }

  /**
   * Send payment reminder across all channels (72hr, 24hr, 2hr before due)
   */
  async sendPaymentReminder(data: {
    customerEmail: string;
    customerPhone?: string;
    deviceToken?: string;
    customerName: string;
    loanId: string;
    amountDue: number;
    dueDate: string;
    merchantName: string;
    hoursRemaining: number;
  }): Promise<void> {
    this.logger.log(`Sending payment reminder for loan ${data.loanId} (${data.hoursRemaining}hrs remaining)`);

    const promises: Promise<void>[] = [];

    // Always send email
    promises.push(
      this.emailService.sendPaymentReminderEmail({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        loanId: data.loanId,
        amountDue: data.amountDue,
        dueDate: data.dueDate,
        merchantName: data.merchantName,
        hoursRemaining: data.hoursRemaining,
      }),
    );

    // Send SMS if phone number provided
    if (data.customerPhone) {
      promises.push(
        this.smsService
          .sendPaymentReminderSms({
            phoneNumber: data.customerPhone,
            customerName: data.customerName,
            amountDue: data.amountDue,
            dueDate: data.dueDate,
            hoursRemaining: data.hoursRemaining,
          })
          .catch((err) => this.logger.error(`SMS reminder failed: ${err.message}`)),
      );
    }

    // Send push if device token provided
    if (data.deviceToken) {
      promises.push(
        this.pushService
          .sendPaymentReminderPush({
            deviceToken: data.deviceToken,
            customerName: data.customerName,
            amountDue: data.amountDue,
            hoursRemaining: data.hoursRemaining,
          })
          .catch((err) => this.logger.error(`Push reminder failed: ${err.message}`)),
      );
    }

    await Promise.all(promises);
    this.logger.log(`Payment reminder sent for loan ${data.loanId}`);
  }

  /**
   * Send payment success notification across all channels
   */
  async sendPaymentSuccess(data: {
    customerEmail: string;
    customerPhone?: string;
    deviceToken?: string;
    customerName: string;
    transactionId: string;
    amountPaid: number;
    paymentDate: string;
    loanId: string;
    merchantName: string;
    remainingBalance?: number;
    nextPaymentDate?: string;
  }): Promise<void> {
    this.logger.log(`Sending payment success notification for transaction ${data.transactionId}`);

    const promises: Promise<void>[] = [];

    // Always send email
    promises.push(
      this.emailService.sendPaymentSuccessEmail({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        transactionId: data.transactionId,
        amountPaid: data.amountPaid,
        paymentDate: data.paymentDate,
        loanId: data.loanId,
        merchantName: data.merchantName,
        remainingBalance: data.remainingBalance,
        nextPaymentDate: data.nextPaymentDate,
      }),
    );

    // Send SMS if phone number provided
    if (data.customerPhone) {
      promises.push(
        this.smsService
          .sendPaymentSuccessSms({
            phoneNumber: data.customerPhone,
            customerName: data.customerName,
            amountPaid: data.amountPaid,
            remainingBalance: data.remainingBalance,
          })
          .catch((err) => this.logger.error(`SMS success failed: ${err.message}`)),
      );
    }

    // Send push if device token provided
    if (data.deviceToken) {
      promises.push(
        this.pushService
          .sendPaymentSuccessPush({
            deviceToken: data.deviceToken,
            customerName: data.customerName,
            amountPaid: data.amountPaid,
            remainingBalance: data.remainingBalance,
          })
          .catch((err) => this.logger.error(`Push success failed: ${err.message}`)),
      );
    }

    await Promise.all(promises);
    this.logger.log(`Payment success notification sent for transaction ${data.transactionId}`);
  }

  /**
   * Send payment failure notification across all channels
   */
  async sendPaymentFailure(data: {
    customerEmail: string;
    customerPhone?: string;
    deviceToken?: string;
    customerName: string;
    loanId: string;
    amountDue: number;
    dueDate: string;
    merchantName: string;
    failureReason: string;
    retryDate?: string;
  }): Promise<void> {
    this.logger.log(`Sending payment failure notification for loan ${data.loanId}`);

    const promises: Promise<void>[] = [];

    // Always send email
    promises.push(
      this.emailService.sendPaymentFailureEmail({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        loanId: data.loanId,
        amountDue: data.amountDue,
        dueDate: data.dueDate,
        merchantName: data.merchantName,
        failureReason: data.failureReason,
        retryDate: data.retryDate,
      }),
    );

    // Send SMS if phone number provided
    if (data.customerPhone) {
      promises.push(
        this.smsService
          .sendPaymentFailureSms({
            phoneNumber: data.customerPhone,
            customerName: data.customerName,
            amountDue: data.amountDue,
            failureReason: data.failureReason,
          })
          .catch((err) => this.logger.error(`SMS failure failed: ${err.message}`)),
      );
    }

    // Send push if device token provided
    if (data.deviceToken) {
      promises.push(
        this.pushService
          .sendPaymentFailurePush({
            deviceToken: data.deviceToken,
            customerName: data.customerName,
            amountDue: data.amountDue,
            failureReason: data.failureReason,
          })
          .catch((err) => this.logger.error(`Push failure failed: ${err.message}`)),
      );
    }

    await Promise.all(promises);
    this.logger.log(`Payment failure notification sent for loan ${data.loanId}`);
  }

  /**
   * Send overdue payment alert across all channels
   */
  async sendOverduePaymentAlert(data: {
    customerEmail: string;
    customerPhone?: string;
    deviceToken?: string;
    customerName: string;
    loanId: string;
    amountDue: number;
    originalDueDate: string;
    daysOverdue: number;
    lateFees: number;
    totalAmountDue: number;
    merchantName: string;
  }): Promise<void> {
    this.logger.log(`Sending overdue payment alert for loan ${data.loanId} (${data.daysOverdue} days)`);

    const promises: Promise<void>[] = [];

    // Always send email
    promises.push(
      this.emailService.sendOverduePaymentEmail({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        loanId: data.loanId,
        amountDue: data.amountDue,
        originalDueDate: data.originalDueDate,
        daysOverdue: data.daysOverdue,
        lateFees: data.lateFees,
        totalAmountDue: data.totalAmountDue,
        merchantName: data.merchantName,
      }),
    );

    // Send SMS if phone number provided
    if (data.customerPhone) {
      promises.push(
        this.smsService
          .sendOverduePaymentSms({
            phoneNumber: data.customerPhone,
            customerName: data.customerName,
            totalAmountDue: data.totalAmountDue,
            daysOverdue: data.daysOverdue,
          })
          .catch((err) => this.logger.error(`SMS overdue failed: ${err.message}`)),
      );
    }

    // Send push if device token provided
    if (data.deviceToken) {
      promises.push(
        this.pushService
          .sendOverduePaymentPush({
            deviceToken: data.deviceToken,
            customerName: data.customerName,
            totalAmountDue: data.totalAmountDue,
            daysOverdue: data.daysOverdue,
          })
          .catch((err) => this.logger.error(`Push overdue failed: ${err.message}`)),
      );
    }

    await Promise.all(promises);
    this.logger.log(`Overdue payment alert sent for loan ${data.loanId}`);
  }

  /**
   * Send loan completion notification across all channels
   */
  async sendLoanCompletion(data: {
    customerEmail: string;
    customerPhone?: string;
    deviceToken?: string;
    customerName: string;
    loanId: string;
    originalAmount: number;
    totalPaid: number;
    completionDate: string;
    merchantName: string;
  }): Promise<void> {
    this.logger.log(`Sending loan completion notification for loan ${data.loanId}`);

    const promises: Promise<void>[] = [];

    // Always send email
    promises.push(
      this.emailService.sendLoanCompletionEmail({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        loanId: data.loanId,
        originalAmount: data.originalAmount,
        totalPaid: data.totalPaid,
        completionDate: data.completionDate,
        merchantName: data.merchantName,
      }),
    );

    // Send SMS if phone number provided
    if (data.customerPhone) {
      promises.push(
        this.smsService
          .sendLoanCompletionSms({
            phoneNumber: data.customerPhone,
            customerName: data.customerName,
            totalPaid: data.totalPaid,
          })
          .catch((err) => this.logger.error(`SMS completion failed: ${err.message}`)),
      );
    }

    // Send push if device token provided
    if (data.deviceToken) {
      promises.push(
        this.pushService
          .sendLoanCompletionPush({
            deviceToken: data.deviceToken,
            customerName: data.customerName,
            totalPaid: data.totalPaid,
          })
          .catch((err) => this.logger.error(`Push completion failed: ${err.message}`)),
      );
    }

    await Promise.all(promises);
    this.logger.log(`Loan completion notification sent for loan ${data.loanId}`);
  }

  /**
   * Send forgot password OTP email
   */
  async sendForgotPasswordOTP(email: string, otp: string, userType: 'merchant' | 'admin'): Promise<void> {
    return this.emailService.sendForgotPasswordOTP(email, otp, userType);
  }
}
