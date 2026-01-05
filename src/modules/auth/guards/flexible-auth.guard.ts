import { Injectable, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Firestore } from '@google-cloud/firestore';

/**
 * Flexible authentication guard that accepts either JWT token or API key
 * Useful for endpoints that need to be accessible from both:
 * - Admin/Merchant dashboard (JWT)
 * - Merchant server-to-server calls (API Key)
 */
@Injectable()
export class FlexibleAuthGuard {
  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if API key is present
    const apiKey =
      request.headers['x-api-key'] ||
      request.headers['x-api-secret'] ||
      request.query.apiKey ||
      request.query.apiSecret;

    if (apiKey) {
      // Try API key authentication
      try {
        const isValid = await this.validateApiKey(apiKey, request);
        if (isValid) {
          return true;
        }
      } catch (error) {
        // API key auth failed, continue to try JWT
      }
    }

    // Check if JWT token is present
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // JWT token present, let Passport handle it
      // The JWT strategy will be invoked automatically by NestJS
      return true;
    }

    // Both authentication methods failed
    throw new UnauthorizedException(
      'Authentication required. Provide either a valid JWT token (Authorization: Bearer <token>) or API key (X-API-Key: <key>)',
    );
  }

  private async validateApiKey(apiKey: string, request: any): Promise<boolean> {
    try {
      // Query merchants collection for matching API key
      const merchantsSnapshot = await this.firestore
        .collection('crl_merchants')
        .where('apiKey', '==', apiKey)
        .limit(1)
        .get();

      if (!merchantsSnapshot.empty) {
        const merchantDoc = merchantsSnapshot.docs[0];
        const merchant = merchantDoc.data();

        if (merchant.status !== 'approved') {
          throw new UnauthorizedException('Merchant account not approved');
        }

        // Attach merchant to request
        request.merchant = {
          merchantId: merchantDoc.id,
          ...merchant,
        };

        return true;
      }

      // Try with apiSecret
      const merchantsSecretSnapshot = await this.firestore
        .collection('crl_merchants')
        .where('apiSecret', '==', apiKey)
        .limit(1)
        .get();

      if (!merchantsSecretSnapshot.empty) {
        const merchantDoc = merchantsSecretSnapshot.docs[0];
        const merchant = merchantDoc.data();

        if (merchant.status !== 'approved') {
          throw new UnauthorizedException('Merchant account not approved');
        }

        // Attach merchant to request
        request.merchant = {
          merchantId: merchantDoc.id,
          ...merchant,
        };

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
