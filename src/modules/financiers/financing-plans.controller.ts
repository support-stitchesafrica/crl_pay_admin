import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service';

@ApiTags('Financing Plans')
@Controller('financing-plans')
export class FinancingPlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all financing plans' })
  async getAllPlans() {
    return this.plansService.getAllPlans();
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get plan by ID' })
  async getPlanById(@Param('planId') planId: string) {
    return this.plansService.getPlanById(planId);
  }
}
