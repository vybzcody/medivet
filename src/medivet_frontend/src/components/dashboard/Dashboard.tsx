import React from 'react';
import { UserRoleValue } from '../../types';
import useAuthStore from '../../stores/useAuthStore';
import PatientDashboard from './PatientDashboard';
import ProviderDashboard from './ProviderDashboard';
import EnhancedPatientDashboard from './EnhancedPatientDashboard';
import EnhancedProviderDashboard from './EnhancedProviderDashboard';
import EnhancedAdminDashboard from './EnhancedAdminDashboard';

const Dashboard: React.FC = () => {
  const { userRole, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Use enhanced dashboards for better UI experience
  switch (userRole) {
    case UserRoleValue.Patient:
      return <EnhancedPatientDashboard />;
    case UserRoleValue.HealthcareProvider:
      return <EnhancedProviderDashboard />;
    default:
      // Admin dashboard or fallback
      return <EnhancedAdminDashboard />;
  }
};

export default Dashboard;
