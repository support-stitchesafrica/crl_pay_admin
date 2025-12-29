import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AnalyticsPeriod } from '../../../entities/analytics.entity';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: 'merchant_123', description: 'Merchant ID (admin only)' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({
    example: 'monthly',
    description: 'Analytics period',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Start date for analytics range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31', description: 'End date for analytics range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: 'merchant_123', description: 'Merchant ID (admin only)' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({
    example: 'monthly',
    description: 'Comparison period for trends',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  period?: AnalyticsPeriod;
}

export class TimeSeriesQueryDto {
  @ApiPropertyOptional({ example: 'merchant_123', description: 'Merchant ID' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({
    example: 'disbursed',
    description: 'Metric to chart',
    enum: ['disbursed', 'collected', 'loans', 'revenue', 'defaults'],
  })
  @IsEnum(['disbursed', 'collected', 'loans', 'revenue', 'defaults'])
  metric: 'disbursed' | 'collected' | 'loans' | 'revenue' | 'defaults';

  @ApiPropertyOptional({
    example: 'daily',
    description: 'Granularity of data points',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  granularity?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31', description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CustomerAnalyticsQueryDto {
  @ApiPropertyOptional({ example: 'merchant_123', description: 'Merchant ID' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ example: 10, description: 'Number of top customers to return' })
  @IsOptional()
  topCount?: number;
}

export class RevenueQueryDto {
  @ApiPropertyOptional({ example: 'merchant_123', description: 'Merchant ID' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({
    example: 'monthly',
    description: 'Breakdown period',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
