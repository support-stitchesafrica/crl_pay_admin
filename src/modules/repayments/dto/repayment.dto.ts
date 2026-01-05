import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordManualRepaymentDto {
  @ApiProperty({ description: 'Loan ID', example: 'loan_123' })
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @ApiProperty({ description: 'Schedule ID', example: 'schedule_123' })
  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ description: 'Amount paid', example: 50000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Payment reference', example: 'BANK_TRANSFER_123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Payment method', example: 'bank_transfer', required: false })
  @IsOptional()
  @IsString()
  method?: string;
}
