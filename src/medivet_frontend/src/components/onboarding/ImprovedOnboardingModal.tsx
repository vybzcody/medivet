import React, { useState } from 'react';
import { UserRole, UserRoleValue } from '../../types';
import useAuthStore from '../../stores/useAuthStore';
import ImprovedPatientOnboarding from './ImprovedPatientOnboarding';
import ProviderOnboarding from './ProviderOnboarding';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProgressSteps from '../ui/ProgressSteps';
import { User, Shield, ArrowLeft, X } from 'lucide-react';

interface ImprovedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImprovedOnboardingModal: React.FC<ImprovedOnboardingModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState('role-selection');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const { setUserRole, isLoading, error } = useAuthStore();

  const steps = [
    {
      id: 'role-selection',
      title: 'Choose Role',
      description: 'Select your account type'
    },
    {
      id: 'profile-setup',
      title: 'Profile Setup',
      description: 'Complete your profile'
    },
    {
      id: 'completion',
      title: 'Complete',
      description: 'Ready to use MediVet'
    }
  ];

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role);
    try {
      // Convert string role to UserRole enum for type safety
      const userRoleValue = role === UserRoleValue.Patient ? UserRole.Patient : UserRole.HealthcareProvider;
      await setUserRole(userRoleValue);
      
      // Mark role selection as completed and move to profile setup
      setCompletedSteps(['role-selection']);
      setCurrentStep('profile-setup');
    } catch (err) {
      console.error('Failed to set user role:', err);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(['role-selection', 'profile-setup']);
    setCurrentStep('completion');
    
    // Close modal after a brief delay to show completion
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleBack = () => {
    if (currentStep === 'profile-setup') {
      setSelectedRole(null);
      setCurrentStep('role-selection');
      setCompletedSteps([]);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedRole(null);
    setCurrentStep('role-selection');
    setCompletedSteps([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Welcome to MediVet</h2>
                <p className="text-blue-100 text-sm">Secure healthcare records on the Internet Computer</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-blue-200 transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <ProgressSteps
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {currentStep === 'role-selection' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Role</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Select how you'll be using MediVet. This will customize your experience and determine what features are available to you.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-blue-200"
                  padding="lg"
                  onClick={() => handleRoleSelect(UserRoleValue.Patient)}
                >
                  <div className="text-center">
                    <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Patient</h4>
                    <p className="text-gray-600 mb-4">
                      I want to manage my personal health records and share them with healthcare providers.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Store encrypted health records
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Control data sharing permissions
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Track access to your data
                      </div>
                    </div>
                  </div>
                </Card>
                
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-green-200"
                  padding="lg"
                  onClick={() => handleRoleSelect(UserRoleValue.HealthcareProvider)}
                >
                  <div className="text-center">
                    <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Healthcare Provider</h4>
                    <p className="text-gray-600 mb-4">
                      I am a healthcare professional who needs to access patient records with proper permissions.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Access shared patient records
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Secure professional profile
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Audit trail compliance
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {currentStep === 'profile-setup' && selectedRole && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to role selection
                </Button>
              </div>
              
              {selectedRole === UserRoleValue.Patient ? (
                <ImprovedPatientOnboarding onComplete={handleComplete} />
              ) : (
                <ProviderOnboarding onComplete={handleComplete} />
              )}
            </div>
          )}

          {currentStep === 'completion' && (
            <div className="text-center py-8">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MediVet!</h3>
              <p className="text-gray-600">
                Your profile has been created successfully. You can now start using MediVet to manage your healthcare data securely.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep === 'role-selection' && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-center">
              <p className="text-sm text-gray-500">
                Your data is encrypted and stored securely on the Internet Computer
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovedOnboardingModal;
