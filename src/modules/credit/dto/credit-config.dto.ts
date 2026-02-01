import { IsString, IsBoolean, IsNumber, IsOptional, ValidateNested, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TierRange {
  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  min: number;

  @ApiProperty({ example: 499 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  max: number;
}

class InstantApprovalThreshold {
  @ApiProperty({ example: 700 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  minScore: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  maxRiskFlags: number;
}

class ConditionalApprovalThreshold {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  minScore: number;

  @ApiProperty({ example: 699 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxScore: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  maxRiskFlags: number;
}

class ManualReviewThreshold {
  @ApiProperty({ example: 400 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  minScore: number;

  @ApiProperty({ example: 499 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxScore: number;
}

class AutoDeclineThreshold {
  @ApiProperty({ example: 399 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxScore: number;
}

export class CreditTierThresholdsDto {
  @ApiProperty({ type: TierRange })
  @ValidateNested()
  @Type(() => TierRange)
  @IsObject()
  bronze: TierRange;

  @ApiProperty({ type: TierRange })
  @ValidateNested()
  @Type(() => TierRange)
  @IsObject()
  silver: TierRange;

  @ApiProperty({ type: TierRange })
  @ValidateNested()
  @Type(() => TierRange)
  @IsObject()
  gold: TierRange;

  @ApiProperty({ type: TierRange })
  @ValidateNested()
  @Type(() => TierRange)
  @IsObject()
  platinum: TierRange;
}

export class ApprovalThresholdsDto {
  @ApiProperty({ type: InstantApprovalThreshold })
  @ValidateNested()
  @Type(() => InstantApprovalThreshold)
  @IsObject()
  instantApproval: InstantApprovalThreshold;

  @ApiProperty({ type: ConditionalApprovalThreshold })
  @ValidateNested()
  @Type(() => ConditionalApprovalThreshold)
  @IsObject()
  conditionalApproval: ConditionalApprovalThreshold;

  @ApiProperty({ type: ManualReviewThreshold })
  @ValidateNested()
  @Type(() => ManualReviewThreshold)
  @IsObject()
  manualReview: ManualReviewThreshold;

  @ApiProperty({ type: AutoDeclineThreshold })
  @ValidateNested()
  @Type(() => AutoDeclineThreshold)
  @IsObject()
  autoDecline: AutoDeclineThreshold;
}

export class InterestRatesDto {
  @ApiProperty({ example: 2.5, description: 'Monthly interest rate for Bronze tier (%)' })
  @IsNumber()
  @Min(0)
  @Max(10)
  bronze: number;

  @ApiProperty({ example: 2.0, description: 'Monthly interest rate for Silver tier (%)' })
  @IsNumber()
  @Min(0)
  @Max(10)
  silver: number;

  @ApiProperty({ example: 1.8, description: 'Monthly interest rate for Gold tier (%)' })
  @IsNumber()
  @Min(0)
  @Max(10)
  gold: number;

  @ApiProperty({ example: 1.5, description: 'Monthly interest rate for Platinum tier (%)' })
  @IsNumber()
  @Min(0)
  @Max(10)
  platinum: number;
}

export class AutoDeclineRulesDto {
  @ApiProperty({ example: 2, description: 'Maximum number of defaulted loans allowed' })
  @IsNumber()
  @Min(0)
  maxDefaultedLoans: number;

  @ApiProperty({ example: 3, description: 'Maximum number of active loans allowed' })
  @IsNumber()
  @Min(0)
  maxActiveLoans: number;

  @ApiProperty({ example: 400, description: 'Minimum credit score required' })
  @IsNumber()
  @Min(0)
  @Max(1000)
  minCreditScore: number;

  @ApiProperty({ example: true, description: 'Auto-decline blacklisted customers' })
  @IsBoolean()
  blacklistedCustomer: boolean;

  @ApiProperty({ example: true, description: 'Auto-decline suspended customers' })
  @IsBoolean()
  suspendedCustomer: boolean;
}

export class ScoringWeightsDto {
  @ApiProperty({ example: 200, description: 'Weight for identity verification score' })
  @IsNumber()
  @Min(0)
  identity: number;

  @ApiProperty({ example: 200, description: 'Weight for behavioral score' })
  @IsNumber()
  @Min(0)
  behavioral: number;

  @ApiProperty({ example: 300, description: 'Weight for financial score' })
  @IsNumber()
  @Min(0)
  financial: number;

  @ApiProperty({ example: 100, description: 'Weight for merchant relationship score' })
  @IsNumber()
  @Min(0)
  merchant: number;

  @ApiProperty({ example: 200, description: 'Weight for credit history score' })
  @IsNumber()
  @Min(0)
  history: number;
}

export class CreateCreditConfigDto {
  @ApiProperty({ example: 'Default Configuration', description: 'Configuration name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Standard credit scoring rules', description: 'Configuration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, description: 'Whether this configuration is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ example: false, description: 'Whether this is the default configuration' })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({ type: CreditTierThresholdsDto })
  @ValidateNested()
  @Type(() => CreditTierThresholdsDto)
  creditTiers: CreditTierThresholdsDto;

  @ApiProperty({ type: ApprovalThresholdsDto })
  @ValidateNested()
  @Type(() => ApprovalThresholdsDto)
  approvalThresholds: ApprovalThresholdsDto;

  @ApiProperty({ type: InterestRatesDto })
  @ValidateNested()
  @Type(() => InterestRatesDto)
  interestRates: InterestRatesDto;

  @ApiProperty({ type: AutoDeclineRulesDto })
  @ValidateNested()
  @Type(() => AutoDeclineRulesDto)
  autoDeclineRules: AutoDeclineRulesDto;

  @ApiProperty({ type: ScoringWeightsDto })
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  scoringWeights: ScoringWeightsDto;

  @ApiPropertyOptional({ example: 'financier_123', description: 'Financier ID for custom configuration' })
  @IsOptional()
  @IsString()
  financierId?: string;
}

export class UpdateCreditConfigDto {
  @ApiPropertyOptional({ example: 'Updated Configuration', description: 'Configuration name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Configuration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this configuration is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether this is the default configuration' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: CreditTierThresholdsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditTierThresholdsDto)
  creditTiers?: CreditTierThresholdsDto;

  @ApiPropertyOptional({ type: ApprovalThresholdsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApprovalThresholdsDto)
  approvalThresholds?: ApprovalThresholdsDto;

  @ApiPropertyOptional({ type: InterestRatesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InterestRatesDto)
  interestRates?: InterestRatesDto;

  @ApiPropertyOptional({ type: AutoDeclineRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AutoDeclineRulesDto)
  autoDeclineRules?: AutoDeclineRulesDto;

  @ApiPropertyOptional({ type: ScoringWeightsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  scoringWeights?: ScoringWeightsDto;
}
