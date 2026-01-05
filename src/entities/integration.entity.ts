export type IntegrationProvider = 'paystack' | 'flutterwave' | 'stripe';

export type IntegrationMode = 'test' | 'live';

export type IntegrationStatus = 'active' | 'inactive';

export interface BaseIntegration {
  integrationId: string;
  provider: IntegrationProvider;
  mode: IntegrationMode;
  label: string;
  status: IntegrationStatus;

  secretKeyEnvRef: string;
  webhookSecretEnvRef?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutIntegration extends BaseIntegration {
  type: 'payout';
}

export interface RepaymentIntegration extends BaseIntegration {
  type: 'repayments';
}

export interface SystemProviderSelection {
  activeProvider: IntegrationProvider;
  activeIntegrationId: string;
  mode: IntegrationMode;
}
