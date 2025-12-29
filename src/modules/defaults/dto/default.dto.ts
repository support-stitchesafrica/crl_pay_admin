import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  EscalationLevel,
  ResolutionStatus,
  ContactMethod,
} from '../../../entities/default.entity';

export class RecordContactAttemptDto {
  @ApiProperty({
    example: 'phone_call',
    description: 'Contact method used',
    enum: ['sms', 'email', 'phone_call', 'whatsapp', 'letter'],
  })
  @IsEnum(['sms', 'email', 'phone_call', 'whatsapp', 'letter'])
  method: ContactMethod;

  @ApiProperty({ example: true, description: 'Whether contact was successful' })
  @IsBoolean()
  successful: boolean;

  @ApiPropertyOptional({ example: 'Customer promised to pay by Friday', description: 'Notes from contact' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentPlanDto {
  @ApiProperty({ example: 50000, description: 'Original overdue amount' })
  @IsNumber()
  @Min(1)
  originalAmount: number;

  @ApiProperty({ example: 55000, description: 'Restructured total amount (may include fees)' })
  @IsNumber()
  @Min(1)
  restructuredAmount: number;

  @ApiProperty({ example: 4, description: 'Number of installments for the plan' })
  @IsNumber()
  @Min(1)
  numberOfInstallments: number;

  @ApiProperty({ example: '2024-01-15', description: 'Start date for payment plan' })
  @IsString()
  startDate: string;
}

export class UpdateDefaultDto {
  @ApiPropertyOptional({
    example: 'medium',
    description: 'Escalation level',
    enum: ['low', 'medium', 'high', 'critical', 'terminal'],
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical', 'terminal'])
  escalationLevel?: EscalationLevel;

  @ApiPropertyOptional({
    example: 'payment_plan',
    description: 'Resolution status',
    enum: ['pending', 'payment_plan', 'partial_payment', 'legal', 'written_off', 'resolved'],
  })
  @IsOptional()
  @IsEnum(['pending', 'payment_plan', 'partial_payment', 'legal', 'written_off', 'resolved'])
  resolutionStatus?: ResolutionStatus;

  @ApiPropertyOptional({ example: 'Customer agreed to payment plan', description: 'Resolution details' })
  @IsOptional()
  @IsString()
  resolutionDetails?: string;

  @ApiPropertyOptional({ example: '2024-01-20', description: 'Next scheduled contact date' })
  @IsOptional()
  @IsString()
  nextContactDate?: string;
}

export class ReportToCreditBureauDto {
  @ApiProperty({ example: 'default_123', description: 'Default ID to report' })
  @IsString()
  defaultId: string;

  @ApiPropertyOptional({ example: 'Multiple failed payment attempts', description: 'Reason for reporting' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DefaultQueryDto {
  @ApiPropertyOptional({ example: 'merchant_123', description: 'Filter by merchant ID' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ example: 'customer_456', description: 'Filter by customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'high',
    description: 'Filter by escalation level',
    enum: ['low', 'medium', 'high', 'critical', 'terminal'],
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical', 'terminal'])
  escalationLevel?: EscalationLevel;

  @ApiPropertyOptional({
    example: 'pending',
    description: 'Filter by resolution status',
    enum: ['pending', 'payment_plan', 'partial_payment', 'legal', 'written_off', 'resolved'],
  })
  @IsOptional()
  @IsEnum(['pending', 'payment_plan', 'partial_payment', 'legal', 'written_off', 'resolved'])
  resolutionStatus?: ResolutionStatus;

  @ApiPropertyOptional({ example: 50, description: 'Limit number of results' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class WriteOffDto {
  @ApiProperty({ example: 'default_123', description: 'Default ID to write off' })
  @IsString()
  defaultId: string;

  @ApiProperty({ example: 'Customer declared bankrupt', description: 'Reason for write-off' })
  @IsString()
  reason: string;
}
