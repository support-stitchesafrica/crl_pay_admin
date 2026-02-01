import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateDisbursementDto {
  @ApiProperty({ description: 'Transaction reference', example: 'STI_1234567890' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Reservation ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({ description: 'Customer ID', example: 'cust_abc123' })
  @IsString()
  @IsNotEmpty()
  customerId: string;
}

export class DisbursementResponseDto {
  loanId: string;
  loanAccountNumber: string;
  status: string;
  disbursementReference: string;
}
