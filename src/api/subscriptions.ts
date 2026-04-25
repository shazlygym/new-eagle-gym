import apiClient from './client';
import { ApiResponse, Subscription, MemberSubscription } from '../types';

export const subscriptionsApi = {
  getAll: async () => {
    const res = await apiClient.get<ApiResponse<Subscription[]>>('/subscriptions');
    return res.data.data;
  },

  create: async (data: { name: string; durationDays: number; price: number; description?: string }) => {
    const res = await apiClient.post<ApiResponse<Subscription>>('/subscriptions', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Subscription>) => {
    const res = await apiClient.put<ApiResponse<Subscription>>(`/subscriptions/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/subscriptions/${id}`);
  },

  assign: async (data: { userId: string; subscriptionId: string; startDate?: string }) => {
    const res = await apiClient.post<ApiResponse<MemberSubscription>>('/subscriptions/assign', data);
    return res.data.data;
  },

  getMemberHistory: async (userId: string) => {
    const res = await apiClient.get<ApiResponse<MemberSubscription[]>>(`/subscriptions/member/${userId}/history`);
    return res.data.data;
  },
};
