import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#0B1020] border border-[#00E5FF] flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(0,229,255,0.4)]">
            🛡️
          </div>
          <div className="absolute -inset-1 rounded-2xl border border-[#00E5FF]/40 animate-ping pointer-events-none" />
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs font-mono text-[#00E5FF] tracking-wider">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>VERIFYING SHIELD SESSION CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
