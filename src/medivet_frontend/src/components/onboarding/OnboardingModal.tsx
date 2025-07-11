import React, { useState } from 'react';
import { UserRole, UserRoleValue } from '../../types';
import useAuthStore from '../../stores/useAuthStore';
import PatientOnboarding from './PatientOnboarding';
import ProviderOnboarding from './ProviderOnboarding';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { setUserRole, isLoading, error } = useAuthStore();

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role);
    try {
      // Convert string role to UserRole enum for type safety
      const userRoleValue = role === UserRoleValue.Patient ? UserRole.Patient : UserRole.HealthcareProvider;
      await setUserRole(userRoleValue);
    } catch (err) {
      console.error('Failed to set user role:', err);
    }
  };

  const handleComplete = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {!selectedRole ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome to MediVet</h2>
              <p className="text-gray-600 mb-8">
                Please select your role to complete your profile setup.
              </p>
              
              {error && (
                <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => handleRoleSelect(UserRoleValue.Patient)}
                  disabled={isLoading}
                  className="p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center"
                >
                  <div className="bg-blue-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Patient</h3>
                  <p className="text-gray-600 text-sm">
                    I want to manage my personal health records
                  </p>
                </button>
                
                <button
                  onClick={() => handleRoleSelect(UserRoleValue.HealthcareProvider)}
                  disabled={isLoading}
                  className="p-6 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex flex-col items-center"
                >
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Healthcare Provider</h3>
                  <p className="text-gray-600 text-sm">
                    I am a healthcare professional providing services
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setSelectedRole(null)}
                className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to role selection
              </button>
              
              {selectedRole === UserRoleValue.Patient ? (
                <PatientOnboarding onComplete={handleComplete} />
              ) : (
                <ProviderOnboarding onComplete={handleComplete} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
