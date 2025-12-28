import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsPhoneNumber, IsEnum } from 'class-validator';

export class UpdateCustomerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsPhoneNumber('NG')
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ enum: ['active', 'suspended', 'blacklisted'], required: false })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'blacklisted'])
  status?: 'active' | 'suspended' | 'blacklisted';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blacklistReason?: string;
}
