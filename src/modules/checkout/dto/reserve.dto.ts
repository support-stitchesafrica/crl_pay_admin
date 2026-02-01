import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReserveAllocationDto {
  @ApiProperty({ description: 'Unique order reference from merchant', example: 'ORDER_123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Amount to reserve (in kobo)', example: 6000000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Customer ID', example: 'cust_123' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Customer credit tier', example: 'gold', enum: ['bronze', 'silver', 'gold', 'platinum'] })
  @IsString()
  @IsNotEmpty()
  creditTier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export class ReservationResponseDto {
  reservationId: string;
  merchantId: string;
  customerId: string;
  reference: string;
  allocationId: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}
