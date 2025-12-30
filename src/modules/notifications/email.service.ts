import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly adminEmail = 'crladmin@yopmail.com';
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });

    // Load and compile templates
    this.loadTemplates();
  }

  /**
   * Load and compile all email templates
   */
  private loadTemplates(): void {
    // Try both development (src) and production (dist) paths
    const possiblePaths = [
      path.join(__dirname, 'templates'),                                    // dist/modules/notifications/templates
      path.join(process.cwd(), 'src/modules/notifications/templates'),     // src/modules/notifications/templates
      path.join(__dirname, '../../../src/modules/notifications/templates'), // from dist to src
    ];

    let templatesDir = '';
    for (const dir of possiblePaths) {
      if (fs.existsSync(dir)) {
        templatesDir = dir;
        this.logger.log(`Templates directory found: ${dir}`);
        break;
      }
    }

    if (!templatesDir) {
      this.logger.error('Templates directory not found! Checked paths:', possiblePaths);
      return;
    }

    const templateFiles = [
      'merchant-registration',
      'admin-merchant-registration',
      'login-notification',
      'merchant-approval',
      'merchant-rejection',
      'payment-reminder',
      'payment-success',
      'payment-failure',
      'loan-completion',
      'overdue-payment',
      'forgot-password-otp',
      'financier-registration',
      'admin-financier-registration',
      'financier-approval',
      'financier-rejection',
      'admin-plan-notification',
    ];

    templateFiles.forEach((templateName) => {
      try {
        const templatePath = path.join(templatesDir, `${templateName}.html`);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        this.templates.set(templateName, Handlebars.compile(templateContent));
        this.logger.log(`Loaded template: ${templateName}`);
      } catch (error) {
        this.logger.error(`Failed to load template ${templateName}: ${error.message}`);
      }
    });
  }

  /**
   * Render an email template with data
   */
  private renderTemplate(templateName: string, data: any): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    return template({ ...data, currentYear: new Date().getFullYear() });
  }

  /**
   * Send email
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send merchant registration email to the merchant and admin
   */
  async sendMerchantRegistrationEmail(merchantEmail: string, merchantName: string): Promise<void> {
    try {
      // Email to merchant
      const merchantHtml = this.renderTemplate('merchant-registration', { merchantName });
      await this.sendEmail(merchantEmail, 'Welcome to CRL Pay - Registration Successful', merchantHtml);

      // Email to admin
      const adminHtml = this.renderTemplate('admin-merchant-registration', {
        merchantName,
        merchantEmail,
        registrationDate: new Date().toLocaleString(),
      });
      await this.sendEmail(this.adminEmail, 'New Merchant Registration - Action Required', adminHtml);

      this.logger.log(`Registration emails sent for merchant: ${merchantEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send registration email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send login notification to admin
   */
  async sendLoginNotificationToAdmin(
    userType: 'merchant' | 'admin' | 'financier',
    email: string,
    name: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const userTypeDisplay = userType === 'admin' ? 'ADMIN' : userType === 'financier' ? 'FINANCIER' : 'MERCHANT';
      const html = this.renderTemplate('login-notification', {
        userType: userTypeDisplay,
        userTypeLower: userType,
        name,
        email,
        loginTime: new Date().toLocaleString(),
        ipAddress,
      });

      const subjectMap = {
        admin: 'Admin',
        merchant: 'Merchant',
        financier: 'Financier',
      };

      await this.sendEmail(
        this.adminEmail,
        `${subjectMap[userType]} Login Notification`,
        html,
      );

      this.logger.log(`Login notification sent for ${userType}: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send login notification: ${error.message}`);
      // Don't throw - login notification failure shouldn't block login
    }
  }

  /**
   * Send merchant approval email
   */
  async sendMerchantApprovalEmail(
    merchantEmail: string,
    merchantName: string,
    notes?: string,
  ): Promise<void> {
    try {
      const html = this.renderTemplate('merchant-approval', {
        merchantName,
        notes,
      });

      await this.sendEmail(
        merchantEmail,
        'Your CRL Pay Merchant Account Has Been Approved!',
        html,
      );

      this.logger.log(`Approval email sent to merchant: ${merchantEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send approval email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send merchant rejection email
   */
  async sendMerchantRejectionEmail(
    merchantEmail: string,
    merchantName: string,
    reason?: string,
  ): Promise<void> {
    try {
      const html = this.renderTemplate('merchant-rejection', {
        merchantName,
        reason,
      });

      await this.sendEmail(merchantEmail, 'CRL Pay Merchant Application Update', html);

      this.logger.log(`Rejection email sent to merchant: ${merchantEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send rejection email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(data: {
    customerEmail: string;
    customerName: string;
    loanId: string;
    amountDue: number;
    dueDate: string;
    merchantName: string;
    hoursRemaining: number;
  }): Promise<void> {
    try {
      const html = this.renderTemplate('payment-reminder', {
        customerName: data.customerName,
        loanId: data.loanId,
        amountDue: data.amountDue.toLocaleString(),
        dueDate: data.dueDate,
        merchantName: data.merchantName,
        hoursRemaining: data.hoursRemaining,
      });

      await this.sendEmail(data.customerEmail, 'Payment Reminder - CRL Pay', html);

      this.logger.log(`Payment reminder sent to: ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment success email
   */
  async sendPaymentSuccessEmail(data: {
    customerEmail: string;
    customerName: string;
    transactionId: string;
    amountPaid: number;
    paymentDate: string;
    loanId: string;
    merchantName: string;
    remainingBalance?: number;
    nextPaymentDate?: string;
  }): Promise<void> {
    try {
      const html = this.renderTemplate('payment-success', {
        customerName: data.customerName,
        transactionId: data.transactionId,
        amountPaid: data.amountPaid.toLocaleString(),
        paymentDate: data.paymentDate,
        loanId: data.loanId,
        merchantName: data.merchantName,
        remainingBalance: data.remainingBalance ? data.remainingBalance.toLocaleString() : null,
        nextPaymentDate: data.nextPaymentDate,
      });

      await this.sendEmail(data.customerEmail, 'Payment Successful - CRL Pay', html);

      this.logger.log(`Payment success email sent to: ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send payment success email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment failure email
   */
  async sendPaymentFailureEmail(data: {
    customerEmail: string;
    customerName: string;
    loanId: string;
    amountDue: number;
    dueDate: string;
    merchantName: string;
    failureReason: string;
    retryDate?: string;
  }): Promise<void> {
    try {
      const html = this.renderTemplate('payment-failure', {
        customerName: data.customerName,
        loanId: data.loanId,
        amountDue: data.amountDue.toLocaleString(),
        dueDate: data.dueDate,
        merchantName: data.merchantName,
        failureReason: data.failureReason,
        retryDate: data.retryDate,
      });

      await this.sendEmail(data.customerEmail, 'Payment Failed - Action Required', html);

      this.logger.log(`Payment failure email sent to: ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send payment failure email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send loan completion email
   */
  async sendLoanCompletionEmail(data: {
    customerEmail: string;
    customerName: string;
    loanId: string;
    originalAmount: number;
    totalPaid: number;
    completionDate: string;
    merchantName: string;
  }): Promise<void> {
    try {
      const html = this.renderTemplate('loan-completion', {
        customerName: data.customerName,
        loanId: data.loanId,
        originalAmount: data.originalAmount.toLocaleString(),
        totalPaid: data.totalPaid.toLocaleString(),
        completionDate: data.completionDate,
        merchantName: data.merchantName,
      });

      await this.sendEmail(data.customerEmail, 'Congratulations! Loan Fully Repaid', html);

      this.logger.log(`Loan completion email sent to: ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send loan completion email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send overdue payment alert email
   */
  async sendOverduePaymentEmail(data: {
    customerEmail: string;
    customerName: string;
    loanId: string;
    amountDue: number;
    originalDueDate: string;
    daysOverdue: number;
    lateFees: number;
    totalAmountDue: number;
    merchantName: string;
  }): Promise<void> {
    try {
      const html = this.renderTemplate('overdue-payment', {
        customerName: data.customerName,
        loanId: data.loanId,
        amountDue: data.amountDue.toLocaleString(),
        originalDueDate: data.originalDueDate,
        daysOverdue: data.daysOverdue,
        lateFees: data.lateFees.toLocaleString(),
        totalAmountDue: data.totalAmountDue.toLocaleString(),
        merchantName: data.merchantName,
      });

      await this.sendEmail(data.customerEmail, 'URGENT: Overdue Payment - Immediate Action Required', html);

      this.logger.log(`Overdue payment email sent to: ${data.customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send overdue payment email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send forgot password OTP email
   */
  async sendForgotPasswordOTP(email: string, otp: string, userType: 'merchant' | 'admin'): Promise<void> {
    try {
      const html = this.renderTemplate('forgot-password-otp', {
        otp,
        userType,
      });

      await this.sendEmail(email, 'Password Reset OTP - CRL Pay', html);
      this.logger.log(`Forgot password OTP sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send forgot password OTP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send financier registration email (to financier and admin)
   */
  async sendFinancierRegistrationEmail(financierEmail: string, companyName: string): Promise<void> {
    try {
      // Email to financier
      const financierHtml = this.renderTemplate('financier-registration', { companyName });
      await this.sendEmail(financierEmail, 'Welcome to CRL Pay - Registration Successful', financierHtml);

      // Email to admin
      const adminHtml = this.renderTemplate('admin-financier-registration', {
        companyName,
        financierEmail,
        registrationDate: new Date().toLocaleString(),
      });
      await this.sendEmail(this.adminEmail, 'New Financier Registration - Action Required', adminHtml);

      this.logger.log(`Registration emails sent for financier: ${financierEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send financier registration email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send financier approval email
   */
  async sendFinancierApprovalEmail(
    financierEmail: string,
    companyName: string,
    notes?: string,
  ): Promise<void> {
    try {
      const html = this.renderTemplate('financier-approval', {
        companyName,
        notes,
      });

      await this.sendEmail(
        financierEmail,
        'Your CRL Pay Financier Account Has Been Approved!',
        html,
      );

      this.logger.log(`Approval email sent to financier: ${financierEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send financier approval email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send financier rejection email
   */
  async sendFinancierRejectionEmail(
    financierEmail: string,
    companyName: string,
    reason?: string,
  ): Promise<void> {
    try {
      const html = this.renderTemplate('financier-rejection', {
        companyName,
        reason,
      });

      await this.sendEmail(financierEmail, 'CRL Pay Financier Application Update', html);

      this.logger.log(`Rejection email sent to financier: ${financierEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send financier rejection email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send new financing plan notification to admin
   */
  async sendPlanCreationNotificationToAdmin(data: {
    financierName: string;
    financierEmail: string;
    planName: string;
    planDescription?: string;
    interestRate: number;
    tenorValue: number;
    tenorPeriod: string;
    minimumAmount: number;
    maximumAmount: number;
    gracePeriodValue: number;
    gracePeriodPeriod: string;
  }): Promise<void> {
    try {
      const html = this.renderTemplate('admin-plan-notification', {
        financierName: data.financierName,
        financierEmail: data.financierEmail,
        creationDate: new Date().toLocaleString(),
        planName: data.planName,
        planDescription: data.planDescription,
        interestRate: data.interestRate,
        tenorValue: data.tenorValue,
        tenorPeriod: data.tenorPeriod.toLowerCase(),
        minimumAmount: data.minimumAmount.toLocaleString(),
        maximumAmount: data.maximumAmount.toLocaleString(),
        gracePeriodValue: data.gracePeriodValue,
        gracePeriodPeriod: data.gracePeriodPeriod.toLowerCase(),
      });

      await this.sendEmail(this.adminEmail, 'New Financing Plan Created - Action Required', html);

      this.logger.log(`Plan creation notification sent to admin for plan: ${data.planName}`);
    } catch (error) {
      this.logger.error(`Failed to send plan creation notification: ${error.message}`);
      throw error;
    }
  }
}
