import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min } from 'class-validator';
import type { PaymentMethod } from '../../../entities/payment.entity';

export class ProcessPaymentDto {
  @IsString()
  loanId: string;

  @IsNumber()
  @Min(1)
  installmentNumber: number;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(['auto-debit', 'manual'])
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RetryPaymentDto {
  @IsString()
  paymentId: string;
}

export class VerifyPaymentDto {
  @IsString()
  reference: string;
}

export class WebhookDto {
  @IsString()
  event: string;

  @IsObject()
  data: any;
}
