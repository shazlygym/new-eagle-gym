import apiClient from './client';
import { ApiResponse, DashboardKPIs, RevenueDataPoint, MemberAnalytics } from '../types';

export const analyticsApi = {
  getDashboard: async () => {
    const res = await apiClient.get<ApiResponse<DashboardKPIs>>('/analytics');
    return res.data.data;
  },

  getRevenue: async (months = 12) => {
    const res = await apiClient.get<ApiResponse<RevenueDataPoint[]>>('/analytics/revenue', { params: { months } });
    return res.data.data;
  },

  getMemberAnalytics: async (userId: string) => {
    const res = await apiClient.get<ApiResponse<MemberAnalytics>>(`/analytics/member/${userId}`);
    return res.data.data;
  },

  getMyAnalytics: async () => {
    const res = await apiClient.get<ApiResponse<MemberAnalytics>>('/analytics/me');
    return res.data.data;
  },

  getNewMembers: async (months = 6) => {
    const res = await apiClient.get<ApiResponse<{ month: string; count: number }[]>>('/analytics/new-members', { params: { months } });
    return res.data.data;
  },

  logBodyStat: async (data: { weight: number; bodyFat?: number; muscleMass?: number }) => {
    const res = await apiClient.post<ApiResponse<any>>('/analytics/stats', data);
    return res.data.data;
  },
};
