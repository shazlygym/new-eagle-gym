import apiClient from './client';
import { ApiResponse, User, PaginationMeta } from '../types';

export const membersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<ApiResponse<User[]>>('/members', { params });
    return { members: res.data.data, meta: res.data.meta as PaginationMeta };
  },

  getById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<User>>(`/members/${id}`);
    return res.data.data;
  },

  getMyProfile: async () => {
    const res = await apiClient.get<ApiResponse<User>>('/members/me/profile');
    return res.data.data;
  },

  create: async (data: { name: string; phone: string; password: string; membershipNumber?: string }) => {
    const res = await apiClient.post<ApiResponse<User>>('/members', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<{ name: string; phone: string; password: string; membershipNumber: string; active: boolean }>) => {
    const res = await apiClient.put<ApiResponse<User>>(`/members/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/members/${id}`);
  },
};
