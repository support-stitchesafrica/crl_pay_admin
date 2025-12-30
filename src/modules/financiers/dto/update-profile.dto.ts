import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SettlementAccountDto {
  @ApiProperty({ example: 'First Bank of Nigeria', required: false })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiProperty({ example: 'ABC Microfinance Bank', required: false })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiProperty({ example: '011', required: false })
  @IsString()
  @IsOptional()
  bankCode?: string;
}

export class UpdateFinancierProfileDto {
  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '123 Finance Street, Lagos', required: false })
  @IsString()
  @IsOptional()
  businessAddress?: string;

  @ApiProperty({ type: SettlementAccountDto, required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SettlementAccountDto)
  settlementAccount?: SettlementAccountDto;
}
