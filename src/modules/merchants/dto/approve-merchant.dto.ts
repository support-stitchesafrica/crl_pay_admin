import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MerchantStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export class ApproveMerchantDto {
  @ApiProperty({ enum: MerchantStatus, example: MerchantStatus.APPROVED })
  @IsEnum(MerchantStatus)
  status: MerchantStatus;

  @ApiProperty({ example: 'Application approved after KYC verification', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
