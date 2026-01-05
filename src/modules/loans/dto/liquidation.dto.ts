import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateLiquidationDto {
  @ApiProperty({ description: 'Loan ID', example: 'loan_123' })
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @ApiProperty({ 
    description: 'Amount to liquidate (optional for partial liquidation). If not provided, calculates full liquidation', 
    example: 200000,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;
}

export class LiquidateLoanDto {
  @ApiProperty({ description: 'Loan ID', example: 'loan_123' })
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @ApiProperty({ 
    description: 'Amount to liquidate (optional for partial liquidation). If not provided, performs full liquidation', 
    example: 200000,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({ description: 'Payment reference', example: 'LIQUIDATION_123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Payment method', example: 'bank_transfer', required: false })
  @IsOptional()
  @IsString()
  method?: string;
}

export interface LiquidationCalculation {
  loanId: string;
  totalDue: number;
  breakdown: {
    unpaidPrincipal: number;
    accruedInterest: number;
    lateFees: number;
    schedulesIncluded: {
      scheduleId: string;
      installmentNumber: number;
      dueDate: Date;
      status: string;
      principalAmount: number;
      interestAmount: number;
      proratedInterest?: number;
      lateFee: number;
    }[];
  };
  isFullLiquidation: boolean;
  remainingBalance?: number;
}
