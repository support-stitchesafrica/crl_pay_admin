import { IsString, IsOptional, IsEnum, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LoanStatus } from '../../../entities/loan.entity';

export class UpdateLoanDto {
  @ApiPropertyOptional({
    example: 'active',
    description: 'Loan status',
    enum: ['pending', 'active', 'completed', 'defaulted', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'active', 'completed', 'defaulted', 'cancelled'])
  status?: LoanStatus;

  @ApiPropertyOptional({ example: 'Customer requested extension', description: 'Admin notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AuthorizeCardDto {
  @ApiProperty({ example: 'AUTH_abc123xyz', description: 'Paystack authorization code' })
  @IsString()
  authorizationCode: string;

  @ApiProperty({ example: 'visa', description: 'Card type (visa, mastercard, etc.)' })
  @IsString()
  cardType: string;

  @ApiProperty({ example: '4081', description: 'Last 4 digits of card' })
  @IsString()
  last4: string;

  @ApiProperty({ example: '12', description: 'Card expiry month' })
  @IsString()
  expiryMonth: string;

  @ApiProperty({ example: '2025', description: 'Card expiry year' })
  @IsString()
  expiryYear: string;

  @ApiProperty({ example: 'GTBank', description: 'Issuing bank name' })
  @IsString()
  bank: string;

  @ApiPropertyOptional({ example: 'CUS_abc123', description: 'Paystack customer code' })
  @IsOptional()
  @IsString()
  paystackCustomerCode?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 'loan_abc123', description: 'Loan ID' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 1, description: 'Installment number being paid' })
  @IsNumber()
  installmentNumber: number;

  @ApiProperty({ example: 15000, description: 'Payment amount in NGN' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'pay_xyz789', description: 'Payment reference ID' })
  @IsString()
  paymentId: string;
}
