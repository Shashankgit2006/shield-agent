import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
  useOutletContext,
} from 'react-router-dom';
import { PageId, SystemMetrics, PrivacyEvent } from './types';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OverviewPage } from './pages/OverviewPage';
import { LiveScreenPage } from './pages/LiveScreenPage';
import { PrivacyMonitorPage } from './pages/PrivacyMonitorPage';
import { AiAgentPage } from './pages/AiAgentPage';
import { PerformancePage } from './pages/PerformancePage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { fetchHealth, fetchMetrics, fetchPrivacyEvents } from './services/api';

const pageToPath: Record<PageId, string> = {
  overview: '/dashboard',
  livescreen: '/live-screen',
  monitor: '/privacy',
  agent: '/agent',
  performance: '/performance',
  activity: '/activity',
  settings: '/settings',
  profile: '/profile',
};

const pathToPage: Record<string, PageId> = {
  '/dashboard': 'overview',
  '/live-screen': 'livescreen',
  '/privacy': 'monitor',
  '/agent': 'agent',
  '/performance': 'performance',
  '/activity': 'activity',
  '/settings': 'settings',
  '/profile': 'profile',
};

interface DashboardContextType {
  metrics: SystemMetrics | null;
  events: PrivacyEvent[];
  serverOnline: boolean;
  loadData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage: PageId = pathToPage[location.pathname] || 'overview';

  const [serverOnline, setServerOnline] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [events, setEvents] = useState<PrivacyEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const health = await fetchHealth();
      setServerOnline(health.status === 'healthy');

      const [m, evs] = await Promise.all([
        fetchMetrics(),
        fetchPrivacyEvents(50),
      ]);
      setMetrics(m);
      setEvents(evs);
    } catch (err) {
      console.warn('Dashboard telemetry fetch notice:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectPage = (page: PageId) => {
    const target = pageToPath[page] || '/dashboard';
    navigate(target);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-[#F8FAFC] flex font-sans">
      {/* Fixed Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onSelectPage={handleSelectPage}
        serverOnline={serverOnline}
        privacyArmed={true}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar
          activePage={activePage}
          serverOnline={serverOnline}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          onNavigate={handleSelectPage}
        />

        <main className="flex-1 p-8 mt-16 max-w-7xl w-full mx-auto">
          <Outlet
            context={{
              metrics,
              events,
              serverOnline,
              loadData,
              onNavigate: handleSelectPage,
            }}
          />
        </main>
      </div>
    </div>
  );
};

// Route wrapper components to pass context to legacy components
const OverviewRouteWrapper: React.FC = () => {
  const { metrics, serverOnline, onNavigate } = useOutletContext<DashboardContextType>();
  return <OverviewPage metrics={metrics} serverOnline={serverOnline} onNavigate={onNavigate} />;
};

const PrivacyRouteWrapper: React.FC = () => {
  const { events } = useOutletContext<DashboardContextType>();
  return <PrivacyMonitorPage events={events} />;
};

const PerformanceRouteWrapper: React.FC = () => {
  const { metrics } = useOutletContext<DashboardContextType>();
  return <PerformancePage metrics={metrics} />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Shield-Agent Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<OverviewRouteWrapper />} />
            <Route path="/live-screen" element={<LiveScreenPage />} />
            <Route path="/privacy" element={<PrivacyRouteWrapper />} />
            <Route path="/agent" element={<AiAgentPage />} />
            <Route path="/performance" element={<PerformanceRouteWrapper />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
