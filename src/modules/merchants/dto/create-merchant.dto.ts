import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, MinLength, IsOptional } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Acme Electronics Ltd' })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'contact@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsPhoneNumber('NG')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'RC123456', required: false })
  @IsOptional()
  @IsString()
  cacNumber?: string;

  @ApiProperty({ example: '123 Business Street, Lagos' })
  @IsNotEmpty()
  @IsString()
  businessAddress: string;

  @ApiProperty({ example: 'Electronics and Gadgets' })
  @IsNotEmpty()
  @IsString()
  businessCategory: string;

  @ApiProperty({ example: 'https://acme-electronics.com' })
  @IsOptional()
  @IsString()
  websiteUrl?: string;
}
