import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, IsDateString, IsOptional, Length, Matches } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsPhoneNumber('NG')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '22334455667', description: '11-digit BVN' })
  @IsNotEmpty()
  @IsString()
  @Length(11, 11)
  @Matches(/^[0-9]{11}$/, { message: 'BVN must be exactly 11 digits' })
  bvn: string;

  @ApiProperty({ example: '1990-01-15', description: 'Date of birth in YYYY-MM-DD format' })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({ example: '123 Main Street, Ikeja' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'Lagos' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Lagos' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: 'merchant_123', description: 'ID of the merchant this customer is registering through' })
  @IsNotEmpty()
  @IsString()
  merchantId: string;

  @ApiProperty({ example: 'fp_abc123xyz', required: false })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiProperty({ example: '192.168.1.1', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}
