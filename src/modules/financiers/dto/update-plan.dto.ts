import { PartialType } from '@nestjs/swagger';
import { CreateFinancingPlanDto } from './create-plan.dto';

export class UpdateFinancingPlanDto extends PartialType(
  CreateFinancingPlanDto,
) {}
