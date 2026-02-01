import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { CreditConfiguration, DEFAULT_CREDIT_CONFIG } from '../../entities/credit-config.entity';
import { CreateCreditConfigDto, UpdateCreditConfigDto } from './dto/credit-config.dto';

@Injectable()
export class CreditConfigService {
  private readonly logger = new Logger(CreditConfigService.name);
  private configCache: Map<string, { config: CreditConfiguration; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  /**
   * Get active configuration for a financier (or default)
   */
  async getActiveConfig(financierId?: string): Promise<CreditConfiguration> {
    const cacheKey = financierId || 'default';
    
    // Check cache first
    const cached = this.configCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Returning cached config for ${cacheKey}`);
      return cached.config;
    }

    try {
      let config: CreditConfiguration | null = null;

      // Try to get financier-specific config first
      if (financierId) {
        const financierConfigSnapshot = await this.firestore
          .collection('crl_credit_config')
          .where('financierId', '==', financierId)
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (!financierConfigSnapshot.empty) {
          config = financierConfigSnapshot.docs[0].data() as CreditConfiguration;
          this.logger.log(`Using financier-specific config for ${financierId}`);
        }
      }

      // Fall back to default config
      if (!config) {
        const defaultConfigSnapshot = await this.firestore
          .collection('crl_credit_config')
          .where('isDefault', '==', true)
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (!defaultConfigSnapshot.empty) {
          config = defaultConfigSnapshot.docs[0].data() as CreditConfiguration;
          this.logger.log('Using default config');
        }
      }

      // If still no config, create default
      if (!config) {
        this.logger.warn('No active config found, creating default');
        config = await this.createDefaultConfig();
      }

      // Cache the config
      this.configCache.set(cacheKey, {
        config,
        timestamp: Date.now(),
      });

      return config;
    } catch (error) {
      this.logger.error(`Failed to get active config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new configuration
   */
  async create(dto: CreateCreditConfigDto, createdBy: string): Promise<CreditConfiguration> {
    try {
      // Validate scoring weights sum to 1000
      const totalWeight = Object.values(dto.scoringWeights).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight !== 1000) {
        throw new BadRequestException(`Scoring weights must sum to 1000, got ${totalWeight}`);
      }

      // If setting as default, unset other defaults
      if (dto.isDefault) {
        await this.unsetAllDefaults();
      }

      const configId = this.firestore.collection('crl_credit_config').doc().id;
      const now = new Date();

      const config: CreditConfiguration = {
        configId,
        ...dto,
        createdBy,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      // Convert to plain object for Firestore
      const plainConfig = JSON.parse(JSON.stringify(config));

      await this.firestore
        .collection('crl_credit_config')
        .doc(configId)
        .set(plainConfig);

      this.logger.log(`Created credit config: ${configId}`);
      this.clearCache();

      return config;
    } catch (error) {
      this.logger.error(`Failed to create config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update an existing configuration
   */
  async update(configId: string, dto: UpdateCreditConfigDto): Promise<CreditConfiguration> {
    try {
      const configDoc = await this.firestore
        .collection('crl_credit_config')
        .doc(configId)
        .get();

      if (!configDoc.exists) {
        throw new NotFoundException('Configuration not found');
      }

      const existingConfig = configDoc.data() as CreditConfiguration;

      // Validate scoring weights if provided
      if (dto.scoringWeights) {
        const totalWeight = Object.values(dto.scoringWeights).reduce((sum, weight) => sum + weight, 0);
        if (totalWeight !== 1000) {
          throw new BadRequestException(`Scoring weights must sum to 1000, got ${totalWeight}`);
        }
      }

      // If setting as default, unset other defaults
      if (dto.isDefault) {
        await this.unsetAllDefaults();
      }

      const updatedConfig: CreditConfiguration = {
        ...existingConfig,
        ...dto,
        updatedAt: new Date(),
        version: existingConfig.version + 1,
      };

      // Convert to plain object for Firestore
      const plainConfig = JSON.parse(JSON.stringify(updatedConfig));

      await this.firestore
        .collection('crl_credit_config')
        .doc(configId)
        .set(plainConfig);

      this.logger.log(`Updated credit config: ${configId}`);
      this.clearCache();

      return updatedConfig;
    } catch (error) {
      this.logger.error(`Failed to update config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a specific configuration by ID
   */
  async findOne(configId: string): Promise<CreditConfiguration> {
    try {
      const configDoc = await this.firestore
        .collection('crl_credit_config')
        .doc(configId)
        .get();

      if (!configDoc.exists) {
        throw new NotFoundException('Configuration not found');
      }

      return configDoc.data() as CreditConfiguration;
    } catch (error) {
      this.logger.error(`Failed to get config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all configurations
   */
  async findAll(): Promise<CreditConfiguration[]> {
    try {
      const snapshot = await this.firestore
        .collection('crl_credit_config')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as CreditConfiguration);
    } catch (error) {
      this.logger.error(`Failed to get configs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a configuration
   */
  async delete(configId: string): Promise<void> {
    try {
      const configDoc = await this.firestore
        .collection('crl_credit_config')
        .doc(configId)
        .get();

      if (!configDoc.exists) {
        throw new NotFoundException('Configuration not found');
      }

      const config = configDoc.data() as CreditConfiguration;

      if (config.isDefault) {
        throw new BadRequestException('Cannot delete default configuration');
      }

      await this.firestore
        .collection('crl_credit_config')
        .doc(configId)
        .delete();

      this.logger.log(`Deleted credit config: ${configId}`);
      this.clearCache();
    } catch (error) {
      this.logger.error(`Failed to delete config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfig(): Promise<CreditConfiguration> {
    const configId = this.firestore.collection('crl_credit_config').doc().id;
    const now = new Date();

    const config: CreditConfiguration = {
      configId,
      ...DEFAULT_CREDIT_CONFIG,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    };

    // Convert to plain object for Firestore
    const plainConfig = JSON.parse(JSON.stringify(config));

    await this.firestore
      .collection('crl_credit_config')
      .doc(configId)
      .set(plainConfig);

    this.logger.log('Created default credit configuration');
    return config;
  }

  /**
   * Unset all default flags
   */
  private async unsetAllDefaults(): Promise<void> {
    const defaultConfigs = await this.firestore
      .collection('crl_credit_config')
      .where('isDefault', '==', true)
      .get();

    const batch = this.firestore.batch();
    defaultConfigs.docs.forEach(doc => {
      batch.update(doc.ref, { isDefault: false, updatedAt: new Date() });
    });

    await batch.commit();
    this.logger.log('Unset all default configurations');
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
    this.logger.debug('Configuration cache cleared');
  }
}
