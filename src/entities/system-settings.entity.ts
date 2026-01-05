import { SystemProviderSelection } from './integration.entity';

export interface SystemPayoutSettings extends SystemProviderSelection {
  settingsId: 'payout';
  updatedAt: Date;
}

export interface SystemRepaymentSettings extends SystemProviderSelection {
  settingsId: 'repayments';
  updatedAt: Date;
}
