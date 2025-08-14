import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import useAuthStore from '../../stores/useAuthStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  
  // Don't show layout on onboarding page or demo pages
  if (location.pathname === '/onboarding' || location.pathname === '/demo' || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
