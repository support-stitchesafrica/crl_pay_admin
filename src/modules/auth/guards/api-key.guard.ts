import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Firestore } from '@google-cloud/firestore';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject('FIRESTORE') private firestore: Firestore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn('No API key provided in request');
      throw new UnauthorizedException('API key is required');
    }

    try {
      // Validate API key against merchant records
      const merchant = await this.validateApiKey(apiKey);

      if (!merchant) {
        this.logger.warn(`Invalid API key: ${apiKey.substring(0, 10)}...`);
        throw new UnauthorizedException('Invalid API key');
      }

      // Check if merchant is approved
      if (merchant.status !== 'approved') {
        this.logger.warn(
          `Merchant not approved: ${merchant.merchantId} (status: ${merchant.status})`,
        );
        throw new UnauthorizedException(
          'Merchant account is not approved. Please contact support.',
        );
      }

      // Attach merchant info to request
      request.merchant = merchant;

      this.logger.log(
        `Authenticated merchant: ${merchant.businessName} (${merchant.merchantId})`,
      );

      return true;
    } catch (error) {
      this.logger.error(`API key validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired API key');
    }
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter (for webhooks)
    const apiKeyQuery = request.query?.apiKey;
    if (apiKeyQuery) {
      return apiKeyQuery;
    }

    return null;
  }

  private async validateApiKey(apiKey: string): Promise<any> {
    try {
      const merchantsRef = this.firestore.collection('crl_merchants');

      // Query by apiKey or apiSecret
      const snapshot = await merchantsRef
        .where('apiKey', '==', apiKey)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { merchantId: doc.id, ...doc.data() };
      }

      // Try apiSecret for server-to-server calls
      const secretSnapshot = await merchantsRef
        .where('apiSecret', '==', apiKey)
        .limit(1)
        .get();

      if (!secretSnapshot.empty) {
        const doc = secretSnapshot.docs[0];
        return { merchantId: doc.id, ...doc.data() };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error validating API key: ${error.message}`);
      throw error;
    }
  }
}
