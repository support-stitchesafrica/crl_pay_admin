import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateDisbursementDto {
  @ApiProperty({ description: 'Order reference', example: 'ORDER_123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Reservation ID from reserve endpoint', example: 'res_123' })
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({ description: 'Customer ID', example: 'cust_123' })
  @IsString()
  @IsNotEmpty()
  customerId: string;
}

export class DisbursementResponseDto {
  disbursementId: string;
  loanId: string;
  loanAccountNumber: string;
  status: string;
  providerReference?: string;
  message: string;
}
