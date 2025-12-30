import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsPhoneNumber, ValidateNested } from 'class-validator';
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

  @ApiProperty({ example: '011', required: false })
  @IsOptional()
  @IsString()
  bankCode?: string;
}

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

  @ApiProperty({ type: SettlementAccountDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SettlementAccountDto)
  settlementAccount?: SettlementAccountDto;

  @ApiProperty({ example: 'RC123456', required: false })
  @IsOptional()
  @IsString()
  cacNumber?: string;

  @ApiProperty({ example: 'Fashion & Clothing', required: false })
  @IsOptional()
  @IsString()
  businessCategory?: string;
}
