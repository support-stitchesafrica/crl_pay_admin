import api from './api';

export interface SettlementBreakdown {
  totalPrincipal: number;
  totalInterest: number;
  totalPenalties: number;
  totalAmount: number;
  loanCount: number;
}

export interface SettlementRequest {
  settlementId: string;
  merchantId: string;
  requestedBy: string;
  requestedAt: Date;
  breakdown: SettlementBreakdown;
  status: string;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  paidBy?: string;
  paidAt?: Date;
  payoutReference?: string;
  requestNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSettlementRequest {
  merchantId: string;
  requestNotes?: string;
}

export interface ApproveSettlementRequest {
  approvalNotes?: string;
}

export interface RejectSettlementRequest {
  rejectionReason: string;
}

export const settlementsService = {
  async getPendingSettlements(): Promise<SettlementRequest[]> {
    const response = await api.get('/settlements/pending');
    return response.data;
  },

  async getAllSettlements(): Promise<SettlementRequest[]> {
    const response = await api.get('/settlements');
    return response.data;
  },

  async getSettlement(settlementId: string): Promise<SettlementRequest> {
    const response = await api.get(`/settlements/${settlementId}`);
    return response.data;
  },

  async getMerchantSettlements(merchantId: string): Promise<SettlementRequest[]> {
    const response = await api.get(`/settlements/merchant/${merchantId}`);
    return response.data;
  },

  async createSettlement(data: CreateSettlementRequest): Promise<SettlementRequest> {
    const response = await api.post('/settlements/request', data);
    return response.data;
  },

  async approveSettlement(settlementId: string, data: ApproveSettlementRequest): Promise<SettlementRequest> {
    const response = await api.post(`/settlements/${settlementId}/approve`, data);
    return response.data;
  },

  async rejectSettlement(settlementId: string, data: RejectSettlementRequest): Promise<SettlementRequest> {
    const response = await api.post(`/settlements/${settlementId}/reject`, data);
    return response.data;
  },

  async processPayout(settlementId: string): Promise<SettlementRequest> {
    const response = await api.post(`/settlements/${settlementId}/payout`);
    return response.data;
  },

  async calculateSettlement(merchantId: string): Promise<SettlementBreakdown> {
    const response = await api.post(`/settlements/calculate/${merchantId}`);
    return response.data;
  },
};
