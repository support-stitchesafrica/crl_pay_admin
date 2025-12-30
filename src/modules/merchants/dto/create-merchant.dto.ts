import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SettlementAccountDto {
  @ApiProperty({ example: 'Access Bank', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: '0123456789', required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ example: 'Acme Electronics Ltd', required: false })
  @IsOptional()
  @IsString()
  accountName?: string;
}

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
  @IsNotEmpty()
  @IsString()
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

  @ApiProperty({ example: '123 Business Street' })
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

  @ApiProperty({ example: 'Nigeria', default: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Electronics and Gadgets' })
  @IsNotEmpty()
  @IsString()
  businessCategory: string;

  @ApiProperty({ example: 'https://acme-electronics.com', required: false })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiProperty({ type: SettlementAccountDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SettlementAccountDto)
  settlementAccount?: SettlementAccountDto;
}
