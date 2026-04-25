import api from './client';
import { WorkoutLog, Exercise, WorkoutSet } from '../types';

export const workoutsApi = {
  getExercises: async (): Promise<Exercise[]> => {
    const res = await api.get('/workouts/exercises');
    return res.data.data;
  },

  createExercise: async (data: { name: string; muscleGroup?: string; videoUrl?: string }): Promise<Exercise> => {
    const res = await api.post('/workouts/exercises', data);
    return res.data.data;
  },

  getMemberLogs: async (userId: string): Promise<WorkoutLog[]> => {
    const res = await api.get(`/workouts/member/${userId}/logs`);
    return res.data.data;
  },

  getTodayLog: async (date?: string): Promise<WorkoutLog> => {
    const res = await api.get('/workouts/today', { params: { date } });
    return res.data.data;
  },

  addSet: async (logId: string, data: { exerciseId: string; setNumber: number; reps?: number; weight?: number; targetReps?: number; targetWeight?: number }) => {
    const res = await api.post(`/workouts/${logId}/sets`, data);
    return res.data.data;
  },

  adminAssignSet: async (data: { userId: string; exerciseId: string; setNumber: number; targetReps?: number; targetWeight?: number; date?: string }) => {
    const res = await api.post('/workouts/admin/assign-set', data);
    return res.data.data;
  },

  updateSet: async (setId: string, data: { reps?: number; weight?: number; targetReps?: number; targetWeight?: number }) => {
    const res = await api.put(`/workouts/sets/${setId}`, data);
    return res.data.data;
  },

  deleteSet: async (setId: string) => {
    const res = await api.delete(`/workouts/sets/${setId}`);
    return res.data.data;
  },

  markComplete: async (logId: string, completed: boolean) => {
    const res = await api.patch(`/workouts/${logId}/complete`, { completed });
    return res.data.data;
  },

  updateLog: async (logId: string, data: { bodyWeight?: number; notes?: string }) => {
    const res = await api.put(`/workouts/${logId}`, data);
    return res.data.data;
  },

  getProgram: async (userId: string): Promise<any[]> => {
    const res = await api.get(`/workouts/member/${userId}/program`);
    return res.data.data;
  },

  addToProgram: async (data: { userId: string; exerciseId: string; setsCount: number; dayName?: string }) => {
    const res = await api.post('/workouts/program', data);
    return res.data.data;
  },

  removeFromProgram: async (userId: string, exerciseId: string) => {
    const res = await api.delete(`/workouts/member/${userId}/program/${exerciseId}`);
    return res.data.data;
  }
};
