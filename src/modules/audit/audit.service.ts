import { Injectable, Logger, Inject } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditAction, AuditResource } from '../../entities/audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly firestore: Firestore;

  constructor(@Inject('FIRESTORE') firestore: Firestore) {
    this.firestore = firestore;
  }

  async createAuditLog(data: Partial<AuditLog>): Promise<void> {
    try {
      const auditId = uuidv4();
      const now = new Date();

      const auditLog: any = {
        auditId,
        timestamp: now,
        userType: data.userType || 'system',
        method: data.method || 'UNKNOWN',
        endpoint: data.endpoint || '',
        path: data.path || '',
        statusCode: data.statusCode || 0,
        responseTime: data.responseTime || 0,
        success: data.success !== undefined ? data.success : true,
        action: data.action || 'UNKNOWN',
        resource: data.resource || 'system',
        createdAt: now,
        ...data,
      };

      // Remove undefined fields to avoid Firestore validation errors
      Object.keys(auditLog).forEach(key => {
        if (auditLog[key] === undefined) {
          delete auditLog[key];
        }
      });

      await this.firestore.collection('crl_audit_logs').doc(auditId).set(auditLog);

      this.logger.log(
        `Audit log created: ${auditLog.action} by ${auditLog.userEmail || auditLog.userType} on ${auditLog.resource}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
    }
  }

  async getAuditLogs(filters?: {
    userType?: string;
    action?: string;
    resource?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      let query: any = this.firestore.collection('crl_audit_logs');

      // Apply filters
      if (filters?.userType) {
        query = query.where('userType', '==', filters.userType);
      }
      if (filters?.action) {
        query = query.where('action', '==', filters.action);
      }
      if (filters?.resource) {
        query = query.where('resource', '==', filters.resource);
      }
      if (filters?.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      if (filters?.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      // Order by timestamp descending
      query = query.orderBy('timestamp', 'desc');

      // Get total count
      const countSnapshot = await query.get();
      const total = countSnapshot.size;

      // Apply pagination
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100); // Default limit
      }

      const snapshot = await query.get();

      const logs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as AuditLog;
      });

      return { logs, total };
    } catch (error) {
      this.logger.error(`Failed to get audit logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAuditLogById(auditId: string): Promise<AuditLog | null> {
    try {
      const doc = await this.firestore.collection('crl_audit_logs').doc(auditId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data) {
        return null;
      }

      return {
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      } as AuditLog;
    } catch (error) {
      this.logger.error(`Failed to get audit log by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAuditLogsByResource(
    resource: AuditResource,
    resourceId: string,
  ): Promise<AuditLog[]> {
    try {
      const snapshot = await this.firestore
        .collection('crl_audit_logs')
        .where('resource', '==', resource)
        .where('resourceId', '==', resourceId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as AuditLog;
      });
    } catch (error) {
      this.logger.error(`Failed to get audit logs by resource: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAuditStats(): Promise<{
    totalLogs: number;
    logsByUserType: Record<string, number>;
    logsByAction: Record<string, number>;
    logsByResource: Record<string, number>;
    recentErrors: number;
  }> {
    try {
      const snapshot = await this.firestore
        .collection('crl_audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();

      const logs = snapshot.docs.map((doc) => doc.data() as AuditLog);

      const logsByUserType: Record<string, number> = {};
      const logsByAction: Record<string, number> = {};
      const logsByResource: Record<string, number> = {};
      let recentErrors = 0;

      logs.forEach((log) => {
        logsByUserType[log.userType] = (logsByUserType[log.userType] || 0) + 1;
        logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;
        logsByResource[log.resource] = (logsByResource[log.resource] || 0) + 1;
        if (!log.success) {
          recentErrors++;
        }
      });

      return {
        totalLogs: logs.length,
        logsByUserType,
        logsByAction,
        logsByResource,
        recentErrors,
      };
    } catch (error) {
      this.logger.error(`Failed to get audit stats: ${error.message}`, error.stack);
      throw error;
    }
  }
}
