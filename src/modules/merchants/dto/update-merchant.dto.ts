import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsPhoneNumber } from 'class-validator';

export class UpdateMerchantDto {
  @ApiProperty({ example: 'Acme Electronics Ltd', required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsOptional()
  @IsPhoneNumber('NG')
  phone?: string;

  @ApiProperty({ example: '123 Business Street, Lagos', required: false })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiProperty({ example: 'https://acme-electronics.com', required: false })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiProperty({ example: 'GT Bank', required: false })
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
