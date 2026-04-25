// ─── Core Types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'MEMBER';
  membershipNumber?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  memberSubscriptions?: MemberSubscription[];
}

export interface Subscription {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface MemberSubscription {
  id: string;
  userId: string;
  subscriptionId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  subscription: Subscription;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  targetReps?: number;
  targetWeight?: number;
  exercise: Exercise;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  date: string;
  completed: boolean;
  bodyWeight?: number;
  notes?: string;
  workoutSets: WorkoutSet[];
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  videoUrl?: string;
}

export interface BodyStat {
  id: string;
  userId: string;
  date: string;
  weight: number;
  bodyFat?: number;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  date: string;
  method: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  user: { id: string; name: string; phone: string; membershipNumber?: string };
  subscription?: { id: string; name: string };
  createdAt: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  timestamp: string;
  method: 'QR' | 'MANUAL';
  user: { id: string; name: string; phone: string; membershipNumber?: string };
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalMembers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  todayCheckins: number;
  totalCheckins: number;
  engagementRate: number;
  activeMembers: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  count: number;
}

export interface MemberAnalytics {
  totalWorkouts: number;
  completedWorkouts: number;
  weeklyWorkouts: number;
  commitmentRate: number;
  weeklyCommitment: number;
  bodyStats: BodyStat[];
  lastCheckin: CheckIn | null;
  subscription: MemberSubscription | null;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
