import apiClient from './client';
import { ApiResponse } from '../types';

export const authApi = {
  login: async (phone: string, password: string) => {
    const res = await apiClient.post<ApiResponse<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; name: string; phone: string; role: string };
    }>>('/auth/login', { phone, password });
    return res.data.data;
  },

  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};
