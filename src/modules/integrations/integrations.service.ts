import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PayoutIntegration, RepaymentIntegration } from '../../entities/integration.entity';
import { SystemPayoutSettings, SystemRepaymentSettings } from '../../entities/system-settings.entity';
import {
  CreatePayoutIntegrationDto,
  CreateRepaymentIntegrationDto,
  UpdateIntegrationDto,
  SetActiveIntegrationDto,
} from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private configService: ConfigService,
  ) {}

  async createPayoutIntegration(dto: CreatePayoutIntegrationDto): Promise<PayoutIntegration> {
    try {
      this.logger.log(`Creating payout integration: ${dto.label}`);

      const secretKey = this.configService.get<string>(dto.secretKeyEnvRef);
      if (!secretKey) {
        throw new BadRequestException(
          `Secret key not found in environment: ${dto.secretKeyEnvRef}`,
        );
      }

      const integrationId = `${dto.provider}-${dto.mode}-${uuidv4().split('-')[0]}`;
      const now = new Date();

      const integration: PayoutIntegration = {
        integrationId,
        type: 'payout',
        provider: dto.provider,
        mode: dto.mode,
        label: dto.label,
        status: 'active',
        secretKeyEnvRef: dto.secretKeyEnvRef,
        webhookSecretEnvRef: dto.webhookSecretEnvRef,
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore
        .collection('crl_payout_integrations')
        .doc(integrationId)
        .set(integration);

      this.logger.log(`Payout integration created: ${integrationId}`);
      return integration;
    } catch (error) {
      this.logger.error(`Failed to create payout integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createRepaymentIntegration(
    dto: CreateRepaymentIntegrationDto,
  ): Promise<RepaymentIntegration> {
    try {
      this.logger.log(`Creating repayment integration: ${dto.label}`);

      const secretKey = this.configService.get<string>(dto.secretKeyEnvRef);
      if (!secretKey) {
        throw new BadRequestException(
          `Secret key not found in environment: ${dto.secretKeyEnvRef}`,
        );
      }

      const integrationId = `${dto.provider}-${dto.mode}-${uuidv4().split('-')[0]}`;
      const now = new Date();

      const integration: RepaymentIntegration = {
        integrationId,
        type: 'repayments',
        provider: dto.provider,
        mode: dto.mode,
        label: dto.label,
        status: 'active',
        secretKeyEnvRef: dto.secretKeyEnvRef,
        webhookSecretEnvRef: dto.webhookSecretEnvRef,
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore
        .collection('crl_repayment_integrations')
        .doc(integrationId)
        .set(integration);

      this.logger.log(`Repayment integration created: ${integrationId}`);
      return integration;
    } catch (error) {
      this.logger.error(`Failed to create repayment integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPayoutIntegrations(): Promise<PayoutIntegration[]> {
    const snapshot = await this.firestore.collection('crl_payout_integrations').get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as PayoutIntegration;
    });
  }

  async getRepaymentIntegrations(): Promise<RepaymentIntegration[]> {
    const snapshot = await this.firestore.collection('crl_repayment_integrations').get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as RepaymentIntegration;
    });
  }

  async updatePayoutIntegration(
    integrationId: string,
    dto: UpdateIntegrationDto,
  ): Promise<PayoutIntegration> {
    try {
      const integrationRef = this.firestore
        .collection('crl_payout_integrations')
        .doc(integrationId);

      const integrationDoc = await integrationRef.get();

      if (!integrationDoc.exists) {
        throw new NotFoundException('Payout integration not found');
      }

      if (dto.secretKeyEnvRef) {
        const secretKey = this.configService.get<string>(dto.secretKeyEnvRef);
        if (!secretKey) {
          throw new BadRequestException(
            `Secret key not found in environment: ${dto.secretKeyEnvRef}`,
          );
        }
      }

      const updateData = {
        ...dto,
        updatedAt: new Date(),
      };

      await integrationRef.update(updateData);

      const updated = await integrationRef.get();
      const data = updated.data();

      return {
        ...data,
        createdAt: data?.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data?.createdAt),
        updatedAt: data?.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : new Date(data?.updatedAt),
      } as PayoutIntegration;
    } catch (error) {
      this.logger.error(`Failed to update payout integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateRepaymentIntegration(
    integrationId: string,
    dto: UpdateIntegrationDto,
  ): Promise<RepaymentIntegration> {
    try {
      const integrationRef = this.firestore
        .collection('crl_repayment_integrations')
        .doc(integrationId);

      const integrationDoc = await integrationRef.get();

      if (!integrationDoc.exists) {
        throw new NotFoundException('Repayment integration not found');
      }

      if (dto.secretKeyEnvRef) {
        const secretKey = this.configService.get<string>(dto.secretKeyEnvRef);
        if (!secretKey) {
          throw new BadRequestException(
            `Secret key not found in environment: ${dto.secretKeyEnvRef}`,
          );
        }
      }

      const updateData = {
        ...dto,
        updatedAt: new Date(),
      };

      await integrationRef.update(updateData);

      const updated = await integrationRef.get();
      const data = updated.data();

      return {
        ...data,
        createdAt: data?.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data?.createdAt),
        updatedAt: data?.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : new Date(data?.updatedAt),
      } as RepaymentIntegration;
    } catch (error) {
      this.logger.error(`Failed to update repayment integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deletePayoutIntegration(integrationId: string): Promise<void> {
    try {
      const settingsDoc = await this.firestore
        .collection('crl_system_settings')
        .doc('payout')
        .get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (settings?.activeIntegrationId === integrationId) {
          throw new BadRequestException(
            'Cannot delete active payout integration. Please set another integration as active first.',
          );
        }
      }

      await this.firestore.collection('crl_payout_integrations').doc(integrationId).delete();

      this.logger.log(`Payout integration deleted: ${integrationId}`);
    } catch (error) {
      this.logger.error(`Failed to delete payout integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteRepaymentIntegration(integrationId: string): Promise<void> {
    try {
      const settingsDoc = await this.firestore
        .collection('crl_system_settings')
        .doc('repayments')
        .get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (settings?.activeIntegrationId === integrationId) {
          throw new BadRequestException(
            'Cannot delete active repayment integration. Please set another integration as active first.',
          );
        }
      }

      await this.firestore.collection('crl_repayment_integrations').doc(integrationId).delete();

      this.logger.log(`Repayment integration deleted: ${integrationId}`);
    } catch (error) {
      this.logger.error(`Failed to delete repayment integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPayoutSettings(): Promise<SystemPayoutSettings | null> {
    const settingsDoc = await this.firestore.collection('crl_system_settings').doc('payout').get();

    if (!settingsDoc.exists) {
      return null;
    }

    const data = settingsDoc.data();
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data?.updatedAt),
    } as SystemPayoutSettings;
  }

  async getRepaymentSettings(): Promise<SystemRepaymentSettings | null> {
    const settingsDoc = await this.firestore
      .collection('crl_system_settings')
      .doc('repayments')
      .get();

    if (!settingsDoc.exists) {
      return null;
    }

    const data = settingsDoc.data();
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data?.updatedAt),
    } as SystemRepaymentSettings;
  }

  async setActivePayoutIntegration(dto: SetActiveIntegrationDto): Promise<SystemPayoutSettings> {
    try {
      const integrationDoc = await this.firestore
        .collection('crl_payout_integrations')
        .doc(dto.integrationId)
        .get();

      if (!integrationDoc.exists) {
        throw new NotFoundException('Payout integration not found');
      }

      const integration = integrationDoc.data();

      if (integration?.status !== 'active') {
        throw new BadRequestException('Integration must be active to be set as default');
      }

      const settings: SystemPayoutSettings = {
        settingsId: 'payout',
        activeProvider: integration.provider,
        activeIntegrationId: dto.integrationId,
        mode: integration.mode,
        updatedAt: new Date(),
      };

      await this.firestore.collection('crl_system_settings').doc('payout').set(settings);

      this.logger.log(`Active payout integration set to: ${dto.integrationId}`);
      return settings;
    } catch (error) {
      this.logger.error(`Failed to set active payout integration: ${error.message}`, error.stack);
      throw error;
    }
  }

  async setActiveRepaymentIntegration(
    dto: SetActiveIntegrationDto,
  ): Promise<SystemRepaymentSettings> {
    try {
      const integrationDoc = await this.firestore
        .collection('crl_repayment_integrations')
        .doc(dto.integrationId)
        .get();

      if (!integrationDoc.exists) {
        throw new NotFoundException('Repayment integration not found');
      }

      const integration = integrationDoc.data();

      if (integration?.status !== 'active') {
        throw new BadRequestException('Integration must be active to be set as default');
      }

      const settings: SystemRepaymentSettings = {
        settingsId: 'repayments',
        activeProvider: integration.provider,
        activeIntegrationId: dto.integrationId,
        mode: integration.mode,
        updatedAt: new Date(),
      };

      await this.firestore.collection('crl_system_settings').doc('repayments').set(settings);

      this.logger.log(`Active repayment integration set to: ${dto.integrationId}`);
      return settings;
    } catch (error) {
      this.logger.error(
        `Failed to set active repayment integration: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
