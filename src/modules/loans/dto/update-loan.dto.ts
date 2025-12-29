import { IsString, IsOptional, IsEnum, IsObject, IsNumber } from 'class-validator';
import type { LoanStatus } from '../../../entities/loan.entity';

export class UpdateLoanDto {
  @IsOptional()
  @IsEnum(['pending', 'active', 'completed', 'defaulted', 'cancelled'])
  status?: LoanStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AuthorizeCardDto {
  @IsString()
  authorizationCode: string;

  @IsString()
  cardType: string;

  @IsString()
  last4: string;

  @IsString()
  expiryMonth: string;

  @IsString()
  expiryYear: string;

  @IsString()
  bank: string;

  @IsOptional()
  @IsString()
  paystackCustomerCode?: string;
}

export class RecordPaymentDto {
  @IsString()
  loanId: string;

  @IsNumber()
  installmentNumber: number;

  @IsNumber()
  amount: number;

  @IsString()
  paymentId: string;
}
