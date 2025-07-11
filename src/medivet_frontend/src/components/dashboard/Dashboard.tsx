import React from 'react';
import { UserRoleValue } from '../../types';
import useAuthStore from '../../stores/useAuthStore';
import PatientDashboard from './PatientDashboard';
import ProviderDashboard from './ProviderDashboard';

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

  // Render the appropriate dashboard based on user role
  switch (userRole) {
    case UserRoleValue.Patient:
      return <PatientDashboard />;
    case UserRoleValue.HealthcareProvider:
      return <ProviderDashboard />;
    default:
      // This should not happen if onboarding is working correctly
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
              <p>User role not set. Please contact support.</p>
            </div>
          </div>
        </div>
      );
  }
};

export default Dashboard;
