import { Injectable, Logger, Inject } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { Customer } from '../../entities/customer.entity';

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicateScore: number; // 0-100 (100 = no duplicates)
  duplicateCount: number;
  duplicateReasons: string[];
  riskFlags: string[];
  matchedCustomers: Array<{
    customerId: string;
    matchType: string;
    matchValue: string;
    similarity: number;
  }>;
}

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  /**
   * Comprehensive duplicate detection across multiple factors
   */
  async checkForDuplicates(customer: Customer): Promise<DuplicateCheckResult> {
    this.logger.log(`Checking for duplicates: ${customer.customerId}`);

    const duplicateReasons: string[] = [];
    const riskFlags: string[] = [];
    const matchedCustomers: Array<{
      customerId: string;
      matchType: string;
      matchValue: string;
      similarity: number;
    }> = [];

    // 1. Check email duplicates
    if (customer.email) {
      const emailDuplicates = await this.findByEmail(customer.email, customer.customerId);
      if (emailDuplicates.length > 0) {
        emailDuplicates.forEach((dup) => {
          matchedCustomers.push({
            customerId: dup.customerId,
            matchType: 'email',
            matchValue: customer.email,
            similarity: 100,
          });
        });
        duplicateReasons.push(`Email already registered (${emailDuplicates.length} matches)`);
        riskFlags.push('Duplicate email address');
      }
    }

    // 2. Check phone number duplicates
    if (customer.phone) {
      const phoneDuplicates = await this.findByPhone(customer.phone, customer.customerId);
      if (phoneDuplicates.length > 0) {
        phoneDuplicates.forEach((dup) => {
          matchedCustomers.push({
            customerId: dup.customerId,
            matchType: 'phone',
            matchValue: customer.phone,
            similarity: 100,
          });
        });
        duplicateReasons.push(`Phone number already registered (${phoneDuplicates.length} matches)`);
        riskFlags.push('Duplicate phone number');
      }
    }

    // 3. Check BVN duplicates
    if (customer.bvn) {
      const bvnDuplicates = await this.findByBVN(customer.bvn, customer.customerId);
      if (bvnDuplicates.length > 0) {
        bvnDuplicates.forEach((dup) => {
          matchedCustomers.push({
            customerId: dup.customerId,
            matchType: 'bvn',
            matchValue: customer.bvn,
            similarity: 100,
          });
        });
        duplicateReasons.push(`BVN already registered (${bvnDuplicates.length} matches)`);
        riskFlags.push('Duplicate BVN - CRITICAL');
      }
    }

    // 4. Check device fingerprint duplicates
    if (customer.deviceFingerprint) {
      const deviceDuplicates = await this.findByDeviceFingerprint(
        customer.deviceFingerprint,
        customer.customerId,
      );
      if (deviceDuplicates.length > 0) {
        deviceDuplicates.forEach((dup) => {
          matchedCustomers.push({
            customerId: dup.customerId,
            matchType: 'device',
            matchValue: customer.deviceFingerprint || '',
            similarity: 100,
          });
        });
        duplicateReasons.push(`Device fingerprint matches ${deviceDuplicates.length} other accounts`);
        riskFlags.push('Shared device detected');
      }
    }

    // 5. Check IP address duplicates (recent registrations)
    if (customer.ipAddress) {
      const ipDuplicates = await this.findByIPAddress(customer.ipAddress, customer.customerId);
      if (ipDuplicates.length > 2) {
        // More than 2 accounts from same IP is suspicious
        ipDuplicates.slice(0, 3).forEach((dup) => {
          matchedCustomers.push({
            customerId: dup.customerId,
            matchType: 'ip',
            matchValue: customer.ipAddress || '',
            similarity: 80,
          });
        });
        duplicateReasons.push(`Multiple accounts from same IP (${ipDuplicates.length} total)`);
        riskFlags.push('Suspicious IP activity');
      }
    }

    // 6. Check name similarity (fuzzy matching)
    const nameDuplicates = await this.findSimilarNames(
      customer.firstName,
      customer.lastName,
      customer.customerId,
    );
    if (nameDuplicates.length > 0) {
      nameDuplicates.forEach((dup) => {
        matchedCustomers.push({
          customerId: dup.customer.customerId,
          matchType: 'name',
          matchValue: `${dup.customer.firstName} ${dup.customer.lastName}`,
          similarity: dup.similarity,
        });
      });
      duplicateReasons.push(`Similar names found (${nameDuplicates.length} matches)`);
      if (nameDuplicates.some((d) => d.similarity > 90)) {
        riskFlags.push('Very similar name detected');
      }
    }

    // Calculate duplicate score (0-100, where 100 = no duplicates)
    const duplicateScore = this.calculateDuplicateScore(matchedCustomers, riskFlags);

    // Remove duplicate entries in matchedCustomers
    const uniqueMatches = this.deduplicateMatches(matchedCustomers);

    const result: DuplicateCheckResult = {
      hasDuplicates: uniqueMatches.length > 0,
      duplicateScore,
      duplicateCount: uniqueMatches.length,
      duplicateReasons,
      riskFlags,
      matchedCustomers: uniqueMatches,
    };

    this.logger.log(
      `Duplicate check complete: Score=${duplicateScore}, Matches=${uniqueMatches.length}`,
    );

    return result;
  }

  /**
   * Find customers by email
   */
  private async findByEmail(email: string, excludeCustomerId: string): Promise<Customer[]> {
    const snapshot = await this.firestore
      .collection('crl_customers')
      .where('email', '==', email.toLowerCase())
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as Customer)
      .filter((c) => c.customerId !== excludeCustomerId);
  }

  /**
   * Find customers by phone number
   */
  private async findByPhone(phone: string, excludeCustomerId: string): Promise<Customer[]> {
    const snapshot = await this.firestore
      .collection('crl_customers')
      .where('phone', '==', phone)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as Customer)
      .filter((c) => c.customerId !== excludeCustomerId);
  }

  /**
   * Find customers by BVN
   */
  private async findByBVN(bvn: string, excludeCustomerId: string): Promise<Customer[]> {
    const snapshot = await this.firestore
      .collection('crl_customers')
      .where('bvn', '==', bvn)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as Customer)
      .filter((c) => c.customerId !== excludeCustomerId);
  }

  /**
   * Find customers by device fingerprint
   */
  private async findByDeviceFingerprint(
    deviceFingerprint: string,
    excludeCustomerId: string,
  ): Promise<Customer[]> {
    const snapshot = await this.firestore
      .collection('crl_customers')
      .where('deviceFingerprint', '==', deviceFingerprint)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as Customer)
      .filter((c) => c.customerId !== excludeCustomerId);
  }

  /**
   * Find customers by IP address (recent registrations only - last 30 days)
   */
  private async findByIPAddress(ipAddress: string, excludeCustomerId: string): Promise<Customer[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await this.firestore
      .collection('crl_customers')
      .where('ipAddress', '==', ipAddress)
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as Customer)
      .filter((c) => c.customerId !== excludeCustomerId);
  }

  /**
   * Find customers with similar names (fuzzy matching)
   */
  private async findSimilarNames(
    firstName: string,
    lastName: string,
    excludeCustomerId: string,
  ): Promise<Array<{ customer: Customer; similarity: number }>> {
    // Get all customers (we'll filter in memory for name similarity)
    // In production, consider using a dedicated search service like Algolia or Elasticsearch
    const snapshot = await this.firestore
      .collection('crl_customers')
      .where('lastName', '==', lastName) // At least match last name
      .get();

    const similarCustomers: Array<{ customer: Customer; similarity: number }> = [];

    snapshot.docs.forEach((doc) => {
      const customer = doc.data() as Customer;
      if (customer.customerId === excludeCustomerId) return;

      const similarity = this.calculateNameSimilarity(
        firstName,
        lastName,
        customer.firstName,
        customer.lastName,
      );

      // Only include if similarity is high (>70%)
      if (similarity > 70) {
        similarCustomers.push({ customer, similarity });
      }
    });

    return similarCustomers.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate name similarity score (0-100)
   */
  private calculateNameSimilarity(
    firstName1: string,
    lastName1: string,
    firstName2: string,
    lastName2: string,
  ): number {
    const normalize = (name: string) => name.toLowerCase().trim().replace(/[^a-z]/g, '');

    const fn1 = normalize(firstName1);
    const ln1 = normalize(lastName1);
    const fn2 = normalize(firstName2);
    const ln2 = normalize(lastName2);

    // Exact match
    if (fn1 === fn2 && ln1 === ln2) return 100;

    // Swapped names
    if (fn1 === ln2 && ln1 === fn2) return 95;

    // First name matches exactly
    if (fn1 === fn2) return 80;

    // Last name matches exactly (already filtered by this)
    if (ln1 === ln2) return 70;

    // Partial matches (one contains the other)
    if (fn1.includes(fn2) || fn2.includes(fn1)) return 60;
    if (ln1.includes(ln2) || ln2.includes(ln1)) return 60;

    // Levenshtein distance for fuzzy matching
    const firstNameDistance = this.levenshteinDistance(fn1, fn2);
    const lastNameDistance = this.levenshteinDistance(ln1, ln2);
    const maxLength = Math.max(fn1.length + ln1.length, fn2.length + ln2.length);
    const totalDistance = firstNameDistance + lastNameDistance;

    const similarity = Math.max(0, 100 - (totalDistance / maxLength) * 100);

    return Math.round(similarity);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate duplicate score based on matches and risk flags
   */
  private calculateDuplicateScore(
    matches: Array<{ matchType: string; similarity: number }>,
    riskFlags: string[],
  ): number {
    if (matches.length === 0) return 100; // No duplicates

    // Critical duplicates (BVN, email, phone) = 0 points
    const hasCriticalDuplicate = matches.some(
      (m) => m.matchType === 'bvn' || m.matchType === 'email' || m.matchType === 'phone',
    );

    if (hasCriticalDuplicate) return 0;

    // Multiple device/IP matches = 30 points
    const deviceMatches = matches.filter((m) => m.matchType === 'device' || m.matchType === 'ip');
    if (deviceMatches.length > 2) return 30;

    // Name similarity only = 50-70 points depending on similarity
    const nameMatches = matches.filter((m) => m.matchType === 'name');
    if (nameMatches.length > 0 && matches.length === nameMatches.length) {
      const avgSimilarity = nameMatches.reduce((sum, m) => sum + m.similarity, 0) / nameMatches.length;
      return Math.max(50, 100 - avgSimilarity);
    }

    // Mixed matches = 40 points
    return 40;
  }

  /**
   * Remove duplicate entries in matched customers
   */
  private deduplicateMatches(
    matches: Array<{ customerId: string; matchType: string; matchValue: string; similarity: number }>,
  ): Array<{ customerId: string; matchType: string; matchValue: string; similarity: number }> {
    const seen = new Set<string>();
    return matches.filter((match) => {
      const key = `${match.customerId}-${match.matchType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
