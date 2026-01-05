import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckEligibilityDto {
  @ApiProperty({ description: 'Amount to check eligibility for (in kobo)', example: 6000000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Customer ID (optional)', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class EligibilityResponseDto {
  eligible: boolean;
  reason?: string;
  eligibleMappings?: Array<{
    mappingId: string;
    planId: string;
    financierId: string;
    remainingAllocation: number;
    expirationDate: Date;
  }>;
}
