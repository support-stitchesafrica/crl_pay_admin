import api from './api';

export interface CapitalPool {
  poolId: string;
  totalCapital: number;
  allocated: number;
  available: number;
  inActiveLoans: number;
  totalRepaid: number;
  totalSettled: number;
  pendingSettlement: number;
  utilizationRate: number;
  metrics: {
    activeLoansCount: number;
    completedLoansCount: number;
    defaultedLoansCount: number;
    utilizationRate: number;
  };
  updatedAt: Date;
}

export interface SetCapitalRequest {
  amount: number;
  notes?: string;
}

export const capitalService = {
  async getPoolStatus(): Promise<CapitalPool> {
    const response = await api.get('/capital-pool');
    return response.data;
  },

  async setTotalCapital(data: SetCapitalRequest): Promise<CapitalPool> {
    const response = await api.post('/capital-pool/set-capital', data);
    return response.data;
  },

  async updateMetrics(): Promise<CapitalPool> {
    const response = await api.post('/capital-pool/update-metrics');
    return response.data;
  },
};
