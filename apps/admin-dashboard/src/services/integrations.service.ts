import api from './api';

export interface PayoutIntegration {
  integrationId: string;
  provider: 'paystack' | 'flutterwave' | 'stripe';
  mode: 'test' | 'live';
  label: string;
  secretKeyEnvRef: string;
  webhookSecretEnvRef?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface RepaymentIntegration extends PayoutIntegration {}

export interface CreateIntegrationDto {
  provider: string;
  mode: string;
  label: string;
  secretKeyEnvRef: string;
  webhookSecretEnvRef?: string;
}

export const integrationsService = {
  // Payout Integrations
  async getPayoutIntegrations(): Promise<PayoutIntegration[]> {
    const response = await api.get('/admin/integrations/payout');
    return response.data.data || [];
  },

  async createPayoutIntegration(data: CreateIntegrationDto): Promise<PayoutIntegration> {
    const response = await api.post('/admin/integrations/payout', data);
    return response.data.data;
  },

  async updatePayoutIntegration(id: string, data: Partial<CreateIntegrationDto>): Promise<PayoutIntegration> {
    const response = await api.put(`/admin/integrations/payout/${id}`, data);
    return response.data.data;
  },

  async deletePayoutIntegration(id: string): Promise<void> {
    await api.delete(`/admin/integrations/payout/${id}`);
  },

  // Repayment Integrations
  async getRepaymentIntegrations(): Promise<RepaymentIntegration[]> {
    const response = await api.get('/admin/integrations/repayments');
    return response.data.data || [];
  },

  async createRepaymentIntegration(data: CreateIntegrationDto): Promise<RepaymentIntegration> {
    const response = await api.post('/admin/integrations/repayments', data);
    return response.data.data;
  },

  async updateRepaymentIntegration(id: string, data: Partial<CreateIntegrationDto>): Promise<RepaymentIntegration> {
    const response = await api.put(`/admin/integrations/repayments/${id}`, data);
    return response.data.data;
  },

  async deleteRepaymentIntegration(id: string): Promise<void> {
    await api.delete(`/admin/integrations/repayments/${id}`);
  },

  // Settings
  async getActivePayoutIntegration(): Promise<{ integrationId: string } | null> {
    try {
      const response = await api.get('/admin/integrations/settings/payout');
      return response.data.data;
    } catch (error) {
      return null;
    }
  },

  async setActivePayoutIntegration(integrationId: string): Promise<void> {
    await api.put('/admin/integrations/settings/payout', { integrationId });
  },

  async getActiveRepaymentIntegration(): Promise<{ integrationId: string } | null> {
    try {
      const response = await api.get('/admin/integrations/settings/repayments');
      return response.data.data;
    } catch (error) {
      return null;
    }
  },

  async setActiveRepaymentIntegration(integrationId: string): Promise<void> {
    await api.put('/admin/integrations/settings/repayments', { integrationId });
  },
};
