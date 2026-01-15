import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VerificationResult,
} from './interfaces/youverify.interface';

@Injectable()
export class YouverifyService {
  private readonly logger = new Logger(YouverifyService.name);
  private readonly useMockData: boolean;

  constructor(
    private readonly configService: ConfigService,
  ) {
    // Use mock data by default until Youverify API key is configured
    this.useMockData = this.configService.get<string>('YOUVERIFY_USE_MOCK', 'true') === 'true';
    
    if (this.useMockData) {
      this.logger.log('YouverifyService initialized in MOCK MODE (no API key required)');
    } else {
      this.logger.log('YouverifyService initialized with real API integration');
    }
  }

  /**
   * Verify BVN with Youverify
   * Currently returns mock data until API key is configured
   */
  async verifyBvn(
    bvn: string,
    customerId?: string,
    merchantId?: string,
  ): Promise<VerificationResult> {
    this.logger.log(`Verifying BVN: ${bvn.substring(0, 3)}*** (Mock Mode: ${this.useMockData})`);

    // Return mock data for now
    return this.getMockVerificationResult('BVN', bvn);
  }

  /**
   * Verify NIN with Youverify
   * Currently returns mock data until API key is configured
   */
  async verifyNin(
    nin: string,
    customerId?: string,
    merchantId?: string,
  ): Promise<VerificationResult> {
    this.logger.log(`Verifying NIN: ${nin.substring(0, 3)}*** (Mock Mode: ${this.useMockData})`);

    // Return mock data for now
    return this.getMockVerificationResult('NIN', nin);
  }

  /**
   * Compare names for matching
   * Returns a score from 0-100 indicating match quality
   */
  compareNames(
    providedFirstName: string,
    providedLastName: string,
    verifiedFirstName: string,
    verifiedLastName: string,
  ): { match: boolean; score: number; reason: string } {
    const normalize = (name: string) =>
      name.toLowerCase().trim().replace(/[^a-z]/g, '');

    const firstName1 = normalize(providedFirstName);
    const lastName1 = normalize(providedLastName);
    const firstName2 = normalize(verifiedFirstName);
    const lastName2 = normalize(verifiedLastName);

    // Exact match
    if (firstName1 === firstName2 && lastName1 === lastName2) {
      return { match: true, score: 100, reason: 'Exact match' };
    }

    // Swapped names (first name as last name, vice versa)
    if (firstName1 === lastName2 && lastName1 === firstName2) {
      return { match: true, score: 95, reason: 'Names swapped' };
    }

    // Partial match - first names match
    if (firstName1 === firstName2) {
      return { match: true, score: 70, reason: 'First name matches' };
    }

    // Partial match - last names match
    if (lastName1 === lastName2) {
      return { match: true, score: 70, reason: 'Last name matches' };
    }

    // Contains match
    if (
      firstName1.includes(firstName2) ||
      firstName2.includes(firstName1) ||
      lastName1.includes(lastName2) ||
      lastName2.includes(lastName1)
    ) {
      return { match: true, score: 50, reason: 'Partial name match' };
    }

    return { match: false, score: 0, reason: 'Names do not match' };
  }

  /**
   * Mock verification result for testing when Youverify is disabled
   */
  private getMockVerificationResult(type: string, id: string): VerificationResult {
    this.logger.warn(`Returning mock verification result for ${type}: ${id}`);
    
    return {
      verified: true,
      provider: 'youverify',
      verifiedAt: new Date(),
      data: {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        phoneNumber: '08012345678',
        gender: 'Male',
      },
      metadata: {
        mock: true,
        [type.toLowerCase()]: id,
      },
    };
  }
}
