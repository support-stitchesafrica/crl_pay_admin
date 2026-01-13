import { IsNumber, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLoanSettingsDto {
  @ApiProperty({ 
    description: 'Days in year for interest calculation (360, 365, or 366)', 
    example: 365,
    enum: [360, 365, 366]
  })
  @IsNumber()
  @IsIn([360, 365, 366])
  daysInYear: number;
}
