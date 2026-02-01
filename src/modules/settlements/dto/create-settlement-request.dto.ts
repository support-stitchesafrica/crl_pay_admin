import { IsString, IsOptional } from 'class-validator';

export class CreateSettlementRequestDto {
  @IsString()
  merchantId: string;

  @IsOptional()
  @IsString()
  requestNotes?: string;
}

export class ApproveSettlementDto {
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class RejectSettlementDto {
  @IsString()
  rejectionReason: string;
}
