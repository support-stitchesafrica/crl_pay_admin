import { Controller, Get, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved successfully' })
  @Audit('VIEW_AUDIT_STATS', 'audit', 'Viewing audit statistics')
  async getAuditStats() {
    try {
      this.logger.log('Getting audit statistics');

      const stats = await this.auditService.getAuditStats();

      return {
        success: true,
        message: 'Audit statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get audit stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('resource/:resource/:resourceId')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  @ApiResponse({ status: 200, description: 'Resource audit logs retrieved successfully' })
  @Audit('VIEW_RESOURCE_AUDIT_LOGS', 'audit', 'Viewing resource audit logs')
  async getAuditLogsByResource(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
  ) {
    try {
      this.logger.log(`Getting audit logs for ${resource}: ${resourceId}`);

      const logs = await this.auditService.getAuditLogsByResource(resource as any, resourceId);

      return {
        success: true,
        message: 'Resource audit logs retrieved successfully',
        data: logs,
      };
    } catch (error) {
      this.logger.error(`Failed to get resource audit logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':auditId')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  @Audit('VIEW_AUDIT_LOG', 'audit', 'Viewing specific audit log')
  async getAuditLogById(@Param('auditId') auditId: string) {
    try {
      this.logger.log(`Getting audit log: ${auditId}`);

      const log = await this.auditService.getAuditLogById(auditId);

      if (!log) {
        return {
          success: false,
          message: 'Audit log not found',
        };
      }

      return {
        success: true,
        message: 'Audit log retrieved successfully',
        data: log,
      };
    } catch (error) {
      this.logger.error(`Failed to get audit log: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @Audit('VIEW_AUDIT_LOGS', 'audit', 'Viewing audit logs')
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    try {
      this.logger.log('Getting audit logs with filters:', query);

      const filters = {
        userType: query.userType,
        action: query.action,
        resource: query.resource,
        userId: query.userId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit || 50,
        offset: query.offset || 0,
      };

      const { logs, total } = await this.auditService.getAuditLogs(filters);

      return {
        success: true,
        message: 'Audit logs retrieved successfully',
        data: {
          logs,
          total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: total > (filters.offset + filters.limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get audit logs: ${error.message}`, error.stack);
      throw error;
    }
  }
}
