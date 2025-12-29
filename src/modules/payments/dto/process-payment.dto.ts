import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentMethod } from '../../../entities/payment.entity';

export class ProcessPaymentDto {
  @ApiProperty({ example: 'loan_abc123', description: 'Loan ID to process payment for' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 1, description: 'Installment number to pay' })
  @IsNumber()
  @Min(1)
  installmentNumber: number;

  @ApiProperty({ example: 15000, description: 'Payment amount in NGN' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'auto-debit',
    description: 'Payment method',
    enum: ['auto-debit', 'manual'],
  })
  @IsEnum(['auto-debit', 'manual'])
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'AUTH_abc123xyz', description: 'Paystack authorization code for auto-debit' })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiPropertyOptional({ description: 'Additional payment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RetryPaymentDto {
  @ApiProperty({ example: 'pay_xyz789', description: 'Payment ID to retry' })
  @IsString()
  paymentId: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'ref_abc123', description: 'Payment reference to verify' })
  @IsString()
  reference: string;
}

export class WebhookDto {
  @ApiProperty({ example: 'charge.success', description: 'Paystack webhook event type' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Webhook event data payload' })
  @IsObject()
  data: any;
}
