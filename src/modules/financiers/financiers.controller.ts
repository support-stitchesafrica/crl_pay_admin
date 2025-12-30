import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanciersService } from './financiers.service';
import { PlansService } from './plans.service';
import { RegisterFinancierDto } from './dto/register-financier.dto';
import { LoginFinancierDto } from './dto/login-financier.dto';
import { UpdateFinancierProfileDto } from './dto/update-profile.dto';
import { CreateFinancingPlanDto } from './dto/create-plan.dto';
import { UpdateFinancingPlanDto } from './dto/update-plan.dto';

@ApiTags('Financiers')
@Controller('financiers')
export class FinanciersController {
  constructor(
    private financiersService: FinanciersService,
    private plansService: PlansService,
  ) {}

  // ============== PUBLIC ROUTES ==============

  @Post('register')
  @ApiOperation({ summary: 'Register new financier' })
  async register(@Body() dto: RegisterFinancierDto) {
    return this.financiersService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Financier login' })
  async login(@Body() dto: LoginFinancierDto) {
    return this.financiersService.login(dto);
  }

  // ============== FINANCIER ROUTES (Requires Auth) ==============

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get financier profile' })
  async getProfile(@Request() req) {
    // Extract financierId from JWT token
    const financierId = req.user?.sub || req.user?.financierId;
    return this.financiersService.getProfile(financierId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update financier profile' })
  async updateProfile(@Request() req, @Body() updates: UpdateFinancierProfileDto) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.financiersService.updateProfile(financierId, updates);
  }

  // ============== FINANCING PLANS ==============

  @Get('me/plans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all financing plans for logged-in financier' })
  async getPlans(@Request() req) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.plansService.getPlans(financierId);
  }

  @Post('me/plans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new financing plan' })
  async createPlan(@Request() req, @Body() dto: CreateFinancingPlanDto) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.plansService.createPlan(financierId, dto);
  }

  @Get('me/plans/:planId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific financing plan' })
  async getPlanById(@Param('planId') planId: string) {
    return this.plansService.getPlanById(planId);
  }

  @Put('me/plans/:planId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update financing plan' })
  async updatePlan(
    @Request() req,
    @Param('planId') planId: string,
    @Body() updates: UpdateFinancingPlanDto,
  ) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.plansService.updatePlan(financierId, planId, updates);
  }

  @Delete('me/plans/:planId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate financing plan' })
  async deactivatePlan(@Request() req, @Param('planId') planId: string) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.plansService.deactivatePlan(financierId, planId);
  }

  // ============== LOANS & ANALYTICS ==============

  @Get('me/loans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all loans using financier plans' })
  async getLoans(@Request() req) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.plansService.getLoans(financierId);
  }

  @Get('me/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get financier analytics' })
  async getAnalytics(@Request() req) {
    const financierId = req.user?.sub || req.user?.financierId;
    return this.plansService.getAnalytics(financierId);
  }

  // ============== ADMIN ROUTES ==============
  // TODO: Add @UseGuards(AdminAuthGuard) when guard is created

  @Get('all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all financiers (Admin only)' })
  async getAllFinanciers(@Query('status') status?: string) {
    return this.financiersService.getAllFinanciers(status);
  }

  @Put(':financierId/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve financier (Admin only)' })
  async approveFinancier(
    @Param('financierId') financierId: string,
    @Request() req,
  ) {
    // TODO: Get admin ID from JWT token
    const adminId = req.user?.adminId || req.user?.sub || 'system';
    return this.financiersService.approveFinancier(financierId, adminId);
  }

  @Put(':financierId/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject financier (Admin only)' })
  async rejectFinancier(
    @Param('financierId') financierId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    // TODO: Get admin ID from JWT token
    const adminId = req.user?.adminId || req.user?.sub || 'system';
    return this.financiersService.rejectFinancier(
      financierId,
      adminId,
      reason,
    );
  }

  @Put(':financierId/suspend')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend financier (Admin only)' })
  async suspendFinancier(
    @Param('financierId') financierId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    // TODO: Get admin ID from JWT token
    const adminId = req.user?.adminId || req.user?.sub || 'system';
    return this.financiersService.suspendFinancier(
      financierId,
      adminId,
      reason,
    );
  }

  @Put(':financierId/funds/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve fund allocation (Admin only)' })
  async approveFunds(
    @Param('financierId') financierId: string,
    @Body('amount') amount: number,
    @Request() req,
  ) {
    // TODO: Get admin ID from JWT token
    const adminId = req.user?.adminId || req.user?.sub || 'system';
    return this.financiersService.approveFunds(financierId, amount, adminId);
  }
}
