import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsEnum,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TenorPeriod {
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS',
}

class TenorDto {
  @ApiProperty({ example: 6 })
  @IsInt()
  @IsPositive()
  value: number;

  @ApiProperty({ example: 'MONTHS', enum: TenorPeriod })
  @IsEnum(TenorPeriod)
  period: TenorPeriod;
}

class GracePeriodDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  value: number;

  @ApiProperty({ example: 'DAYS', enum: TenorPeriod })
  @IsEnum(TenorPeriod)
  period: TenorPeriod;
}

class LateFeeDto {
  @ApiProperty({ example: 'fixed', enum: ['fixed', 'percentage'] })
  @IsEnum(['fixed', 'percentage'])
  type: 'fixed' | 'percentage';

  @ApiProperty({ example: 5 })
  @IsNumber()
  amount: number;
}

class EligibilityCriteriaDto {
  @ApiProperty({ example: 600, required: false })
  @IsOptional()
  @IsNumber()
  minCreditScore?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @IsNumber()
  minMonthlyIncome?: number;

  @ApiProperty({ example: 0.4, required: false })
  @IsOptional()
  @IsNumber()
  maxDebtToIncome?: number;

  @ApiProperty({ example: 6, required: false })
  @IsOptional()
  @IsNumber()
  minEmploymentMonths?: number;

  @ApiProperty({
    example: ['@company.com'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEmailDomains?: string[];

  @ApiProperty({
    example: ['Electronics', 'Fashion'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCategories?: string[];
}

export class CreateFinancingPlanDto {
  @ApiProperty({ example: '6-Month Standard Plan' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Standard 6-month financing with competitive rates' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: TenorDto, example: { value: 6, period: 'MONTHS' } })
  @ValidateNested()
  @Type(() => TenorDto)
  tenor: TenorDto;

  @ApiProperty({ example: 5, description: 'Interest rate as a percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1000)
  minimumAmount: number;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  maximumAmount: number;

  @ApiProperty({ type: GracePeriodDto, example: { value: 3, period: 'DAYS' } })
  @ValidateNested()
  @Type(() => GracePeriodDto)
  gracePeriod: GracePeriodDto;

  @ApiProperty({ type: LateFeeDto })
  @ValidateNested()
  @Type(() => LateFeeDto)
  lateFee: LateFeeDto;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowEarlyRepayment: boolean;

  @ApiPropertyOptional({ type: EligibilityCriteriaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EligibilityCriteriaDto)
  eligibilityCriteria?: EligibilityCriteriaDto;
}
