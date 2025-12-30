import { IsBoolean, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlanStatusDto {
  @ApiProperty({ example: true, description: 'Enable or disable the plan' })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.999Z',
    description: 'Plan expiration date (deprecated - expiration is now set per merchant mapping)'
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
