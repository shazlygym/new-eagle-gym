import apiClient from './client';
import { ApiResponse, Payment, PaginationMeta, RevenueDataPoint } from '../types';

export const paymentsApi = {
  getAll: async (params?: { page?: number; limit?: number; userId?: string; month?: number; year?: number }) => {
    const res = await apiClient.get<ApiResponse<Payment[]>>('/payments', { params });
    return { payments: res.data.data, meta: res.data.meta as PaginationMeta };
  },

  record: async (data: { userId: string; subscriptionId?: string; amount: number; method: 'CASH' | 'CARD' | 'TRANSFER'; date?: string; notes?: string }) => {
    const res = await apiClient.post<ApiResponse<Payment>>('/payments', data);
    return res.data.data;
  },

  getRevenue: async (months = 12) => {
    const res = await apiClient.get<ApiResponse<RevenueDataPoint[]>>('/payments/revenue', { params: { months } });
    return res.data.data;
  },

  getMemberPayments: async (userId: string) => {
    const res = await apiClient.get<ApiResponse<Payment[]>>(`/payments/member/${userId}`);
    return res.data.data;
  },

  exportCsv: (params?: { month?: number; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', String(params.month));
    if (params?.year) query.set('year', String(params.year));
    window.open(`/api/payments/export?${query.toString()}`, '_blank');
  },
};
