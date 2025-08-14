import React from 'react';
import { UserRoleValue } from '../../types';
import useAuthStore from '../../stores/useAuthStore';
import EnhancedPatientProfile from './EnhancedPatientProfile';
import EnhancedProviderProfile from './EnhancedProviderProfile';

const Profile: React.FC = () => {
  const { userRole, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate profile based on user role
  switch (userRole) {
    case UserRoleValue.Patient:
      return <EnhancedPatientProfile />;
    case UserRoleValue.HealthcareProvider:
      return <EnhancedProviderProfile />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
              <p>Profile not available for this user role.</p>
            </div>
          </div>
        </div>
      );
  }
};

export default Profile;
