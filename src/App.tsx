import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import Subscriptions from './pages/Subscriptions';
import Payments from './pages/Payments';
import Checkins from './pages/Checkins';
import Exports from './pages/Exports';
import Exercises from './pages/Exercises';
import MemberDashboard from './pages/MemberDashboard';
import MemberWorkouts from './pages/MemberWorkouts';
import MemberAttendance from './pages/MemberAttendance';
import MemberProfileView from './pages/MemberProfileView';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <Sidebar />
      <main className="flex-1 mr-64 p-6 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

function MemberLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'MEMBER') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="bg-dark-800 border-b border-dark-600 p-4 flex justify-between items-center">
        <h1 className="text-white font-bold text-xl">Eagle Gym - بوابة العضو</h1>
        <button onClick={() => useAuthStore.getState().logout()} className="text-red-400 text-sm font-semibold">تسجيل الخروج</button>
      </header>
      <main className="flex-1 p-4 max-w-full overflow-x-hidden max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={user?.role === 'ADMIN' ? "/dashboard" : "/app"} replace /> : <Login />}
        />
        
        {/* ADMIN ROUTES */}
        <Route path="/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/members" element={<AdminLayout><Members /></AdminLayout>} />
        <Route path="/members/:id" element={<AdminLayout><MemberProfile /></AdminLayout>} />
        <Route path="/subscriptions" element={<AdminLayout><Subscriptions /></AdminLayout>} />
        <Route path="/payments" element={<AdminLayout><Payments /></AdminLayout>} />
        <Route path="/checkins" element={<AdminLayout><Checkins /></AdminLayout>} />
        <Route path="/exports" element={<AdminLayout><Exports /></AdminLayout>} />
        <Route path="/exercises" element={<AdminLayout><Exercises /></AdminLayout>} />

        {/* MEMBER ROUTES */}
        <Route path="/app" element={<MemberLayout><MemberDashboard /></MemberLayout>} />
        <Route path="/app/workouts" element={<MemberLayout><MemberWorkouts /></MemberLayout>} />
        <Route path="/app/attendance" element={<MemberLayout><MemberAttendance /></MemberLayout>} />
        <Route path="/app/profile" element={<MemberLayout><MemberProfileView /></MemberLayout>} />

        <Route path="*" element={<Navigate to={isAuthenticated ? (user?.role === 'ADMIN' ? "/dashboard" : "/app") : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
