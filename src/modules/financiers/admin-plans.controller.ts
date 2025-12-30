import { Controller, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Admin - Financing Plans')
@ApiBearerAuth()
@Controller('admin/financing-plans')
@UseGuards(JwtAuthGuard)
export class AdminPlansController {
  constructor(private plansService: PlansService) {}

  @Post(':planId/approve')
  @ApiOperation({ summary: 'Approve a financing plan and allocate funds' })
  async approvePlan(
    @Param('planId') planId: string,
    @Body() body: { fundsAllocated: number },
  ) {
    return this.plansService.approvePlan(planId, body.fundsAllocated);
  }

  @Post(':planId/allocate-funds')
  @ApiOperation({ summary: 'Allocate additional funds to an approved plan' })
  async allocateFunds(
    @Param('planId') planId: string,
    @Body() body: { additionalFunds: number },
  ) {
    return this.plansService.allocateFunds(planId, body.additionalFunds);
  }

  @Put(':planId/status')
  @ApiOperation({ summary: 'Enable or disable an approved financing plan' })
  async updatePlanStatus(
    @Param('planId') planId: string,
    @Body() statusDto: UpdatePlanStatusDto,
  ) {
    return this.plansService.updatePlanStatus(planId, statusDto);
  }
}
