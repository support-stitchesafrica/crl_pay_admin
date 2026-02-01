import { IsString, IsNumber, IsDate, IsOptional, ValidateNested, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PenaltyDto {
  @IsEnum(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  gracePeriodDays: number;
}

class AllocationTermsDto {
  @IsNumber()
  @Min(1)
  tenure: number;

  @IsEnum(['months', 'weeks', 'days'])
  tenurePeriod: 'months' | 'weeks' | 'days';

  @ValidateNested()
  @Type(() => PenaltyDto)
  penalty: PenaltyDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minLoanAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLoanAmount?: number;
}

export class CreateAllocationDto {
  @IsString()
  merchantId: string;

  @IsNumber()
  @Min(1)
  allocatedAmount: number;

  @ValidateNested()
  @Type(() => AllocationTermsDto)
  terms: AllocationTermsDto;

  @IsDate()
  @Type(() => Date)
  expiresAt: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
