import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  RepaymentFrequency,
  Tenor,
  TenorPeriod,
  LoanConfiguration,
  PaymentScheduleItem,
} from '../../entities/loan.entity';

@Injectable()
export class LoanCalculatorService {
  /**
   * Convert tenor to total days
   */
  private tenorToDays(tenor: Tenor): number {
    const { value, period } = tenor;

    const daysMap: Record<TenorPeriod, number> = {
      DAYS: 1,
      WEEKS: 7,
      MONTHS: 30, // Approximate
      YEARS: 365, // Approximate
    };

    return value * daysMap[period];
  }

  /**
   * Get payment interval in days based on frequency
   */
  private getIntervalDays(frequency: RepaymentFrequency): number {
    const intervalMap: Record<RepaymentFrequency, number> = {
      daily: 1,
      weekly: 7,
      'bi-weekly': 14,
      monthly: 30,
      quarterly: 90,
      'bi-annually': 182,
      annually: 365,
    };

    return intervalMap[frequency];
  }

  /**
   * Calculate number of installments based on tenor and frequency
   * Formula: Total Days ÷ Interval Days
   */
  private calculateNumberOfInstallments(
    tenor: Tenor,
    frequency: RepaymentFrequency,
  ): number {
    const totalDays = this.tenorToDays(tenor);
    const intervalDays = this.getIntervalDays(frequency);

    // Number of installments = Total tenor days / Payment interval days
    const numberOfInstallments = Math.ceil(totalDays / intervalDays);

    if (numberOfInstallments < 1) {
      throw new BadRequestException('Invalid tenor and frequency combination');
    }

    return numberOfInstallments;
  }

  /**
   * Calculate loan configuration including interest and installments
   */
  calculateLoanConfiguration(
    principalAmount: number,
    frequency: RepaymentFrequency,
    tenor: Tenor,
    interestRate: number,    // Annual interest rate from merchant config
    penaltyRate: number,      // Penalty rate from merchant config
  ): LoanConfiguration {
    if (principalAmount <= 0) {
      throw new BadRequestException('Principal amount must be greater than zero');
    }

    if (interestRate < 0) {
      throw new BadRequestException('Interest rate cannot be negative');
    }

    if (penaltyRate < 0) {
      throw new BadRequestException('Penalty rate cannot be negative');
    }

    const numberOfInstallments = this.calculateNumberOfInstallments(tenor, frequency);

    // Calculate total interest based on tenor period
    // Formula: (Principal × Annual Rate × Tenor Period) / 12 (for months) or / 365 (for days)
    let totalInterest: number;

    const tenorInYears = this.tenorToDays(tenor) / 365;
    totalInterest = (principalAmount * interestRate * tenorInYears) / 100;

    // Total amount to be repaid
    const totalAmount = principalAmount + totalInterest;

    // Amount per installment (round up to nearest integer)
    const installmentAmount = Math.ceil(totalAmount / numberOfInstallments);

    return {
      frequency,
      tenor,
      numberOfInstallments,
      interestRate,
      penaltyRate,
      installmentAmount,
      totalInterest: Math.ceil(totalInterest),
      totalAmount: installmentAmount * numberOfInstallments, // Recalculate to account for rounding
    };
  }

  /**
   * Generate payment schedule for a loan
   */
  generatePaymentSchedule(
    configuration: LoanConfiguration,
    startDate: Date = new Date(),
  ): PaymentScheduleItem[] {
    const schedule: PaymentScheduleItem[] = [];
    const intervalDays = this.getIntervalDays(configuration.frequency);

    // Calculate principal and interest per installment
    const principalPerInstallment = Math.floor(
      (configuration.totalAmount - configuration.totalInterest) /
        configuration.numberOfInstallments,
    );
    const interestPerInstallment = Math.floor(
      configuration.totalInterest / configuration.numberOfInstallments,
    );

    for (let i = 1; i <= configuration.numberOfInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + i * intervalDays);

      // For the last installment, adjust amounts to ensure totals match exactly
      const isLastInstallment = i === configuration.numberOfInstallments;
      const principalAmount = isLastInstallment
        ? configuration.totalAmount -
          configuration.totalInterest -
          principalPerInstallment * (i - 1)
        : principalPerInstallment;
      const interestAmount = isLastInstallment
        ? configuration.totalInterest - interestPerInstallment * (i - 1)
        : interestPerInstallment;

      schedule.push({
        installmentNumber: i,
        dueDate,
        amount: configuration.installmentAmount,
        principalAmount,
        interestAmount,
        status: 'pending',
        attemptCount: 0,
      });
    }

    return schedule;
  }

  /**
   * Calculate early repayment amount (remaining principal + reduced interest)
   */
  calculateEarlyRepayment(
    principalAmount: number,
    amountPaid: number,
    totalInterest: number,
    currentInstallment: number,
    totalInstallments: number,
  ): {
    remainingPrincipal: number;
    adjustedInterest: number;
    totalEarlyRepayment: number;
    savings: number;
  } {
    const paidPrincipal = principalAmount * (currentInstallment / totalInstallments);
    const remainingPrincipal = principalAmount - paidPrincipal;

    // Proportional interest reduction (pay only for periods used)
    const adjustedInterest =
      totalInterest * ((totalInstallments - currentInstallment) / totalInstallments);

    const totalEarlyRepayment = remainingPrincipal + adjustedInterest;
    const originalRemaining = principalAmount + totalInterest - amountPaid;
    const savings = originalRemaining - totalEarlyRepayment;

    return {
      remainingPrincipal: Math.ceil(remainingPrincipal),
      adjustedInterest: Math.ceil(adjustedInterest),
      totalEarlyRepayment: Math.ceil(totalEarlyRepayment),
      savings: Math.ceil(savings),
    };
  }

  /**
   * Calculate late fees/penalties for overdue payments
   * Uses the penalty rate from merchant configuration
   */
  calculateLateFees(
    overdueAmount: number,
    daysOverdue: number,
    penaltyRate: number,
  ): number {
    if (daysOverdue <= 0) return 0;

    // Apply penalty rate to overdue amount
    // This is a simple implementation - you can make it more sophisticated
    // For example, compounding daily or having escalating rates
    const lateFee = (overdueAmount * penaltyRate) / 100;

    return Math.ceil(lateFee);
  }

  /**
   * Validate if a tenor and frequency combination is allowed
   */
  validateTenorFrequencyCombination(
    tenor: Tenor,
    frequency: RepaymentFrequency,
  ): { valid: boolean; message?: string } {
    const totalDays = this.tenorToDays(tenor);
    const intervalDays = this.getIntervalDays(frequency);

    // Ensure at least 2 installments
    const numberOfInstallments = Math.ceil(totalDays / intervalDays);
    if (numberOfInstallments < 2) {
      return {
        valid: false,
        message: `Tenor of ${tenor.value} ${tenor.period} with ${frequency} frequency would result in less than 2 installments`,
      };
    }

    // Ensure not too many installments (optional limit, e.g., max 365 installments)
    if (numberOfInstallments > 365) {
      return {
        valid: false,
        message: `Combination would result in ${numberOfInstallments} installments, which exceeds the maximum of 365`,
      };
    }

    return { valid: true };
  }
}
