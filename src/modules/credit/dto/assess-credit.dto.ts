import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max, ValidateIf } from 'class-validator';

export class AssessCreditDto {
  @ApiProperty({ example: 'cust_123', description: 'Customer ID' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'merch_123', description: 'Merchant ID (auto-populated from API key)', required: false })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({ example: 50000, description: 'Requested loan amount in NGN' })
  @IsNotEmpty()
  @IsNumber()
  @Min(5000)
  @Max(5000000)
  requestedAmount: number;

  @ApiProperty({ example: 4, description: 'Requested tenure in weeks (1-52)', required: false })
  @IsOptional()
  @ValidateIf((o) => o.requestedTenure !== undefined && o.requestedTenure !== null)
  @IsNumber({}, { message: 'requestedTenure must be a number' })
  @Min(1, { message: 'requestedTenure must not be less than 1' })
  @Max(52, { message: 'requestedTenure must not be greater than 52' })
  requestedTenure?: number;

  @ApiProperty({ example: 'Business inventory purchase', required: false })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({ example: '192.168.1.1', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ example: 'fp_abc123xyz', required: false })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}
