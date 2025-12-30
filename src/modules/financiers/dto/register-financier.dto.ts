import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class SettlementAccountDto {
  @ApiPropertyOptional({ example: 'First Bank of Nigeria' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'ABC Microfinance Bank Ltd' })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({ example: '011' })
  @IsString()
  @IsOptional()
  bankCode?: string;
}

export class RegisterFinancierDto {
  @ApiProperty({ example: 'ABC Microfinance Bank' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'finance@abcbank.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '123 Finance Street, Lagos' })
  @IsString()
  businessAddress: string;

  @ApiProperty({ example: 'Microfinance' })
  @IsString()
  businessCategory: string;

  @ApiProperty({ example: 'RC123456' })
  @IsString()
  registrationNumber: string;

  @ApiProperty({ example: 'TAX123456' })
  @IsString()
  taxId: string;

  @ApiPropertyOptional({ type: SettlementAccountDto })
  @ValidateNested()
  @Type(() => SettlementAccountDto)
  @IsOptional()
  settlementAccount?: SettlementAccountDto;
}
