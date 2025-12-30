import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Financing Plans')
@Controller('financing-plans')
export class FinancingPlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all financing plans' })
  async getAllPlans() {
    try {
      const plans = await this.plansService.getAllPlans();
      return ApiResponse.success(plans, 'Financing plans retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get plan by ID' })
  async getPlanById(@Param('planId') planId: string) {
    try {
      const plan = await this.plansService.getPlanById(planId);
      return ApiResponse.success(plan, 'Financing plan retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
