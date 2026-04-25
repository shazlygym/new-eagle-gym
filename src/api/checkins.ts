import apiClient from './client';
import { ApiResponse } from '../types';

export interface Checkin {
  id: string;
  userId: string;
  date: string;
  method: string;
}

export const checkinsApi = {
  getMyCheckins: async (limit = 30): Promise<Checkin[]> => {
    const res = await apiClient.get<ApiResponse<Checkin[]>>('/checkins/me', { params: { limit } });
    return res.data.data;
  },

  generateQR: async (): Promise<{ qrCode: string }> => {
    const res = await apiClient.get<ApiResponse<{ qrCode: string }>>('/checkins/qr/me');
    return res.data.data;
  }
};
