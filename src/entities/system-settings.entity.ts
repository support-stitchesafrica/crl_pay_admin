import { SystemProviderSelection } from './integration.entity';

export interface SystemPayoutSettings extends SystemProviderSelection {
  settingsId: 'payout';
  updatedAt: Date;
}

export interface SystemRepaymentSettings extends SystemProviderSelection {
  settingsId: 'repayments';
  updatedAt: Date;
}

export interface SystemLoanSettings {
  settingsId: 'loan_settings';
  daysInYear: number;            // Days in year for interest calculation (360, 365, or 366)
  updatedAt: Date;
}
