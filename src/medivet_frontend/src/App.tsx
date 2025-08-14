import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/useAuthStore';
import useProfileStore from './stores/useProfileStore';
import LandingPage from './components/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import ImprovedOnboardingModal from './components/onboarding/ImprovedOnboardingModal';
import { ToastProvider } from './hooks/useToast';
import { UserRoleValue } from './types';

function App(): JSX.Element {
  const { isAuthenticated, initialize, userRole, principal } = useAuthStore();
  const { 
    patientProfile, 
    healthcareProviderProfile, 
    fetchPatientProfile, 
    fetchHealthcareProviderProfile 
  } = useProfileStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize authentication on app load
  useEffect(() => {
    const init = async () => {
      console.log('App: Initializing authentication...');
      await initialize();
      console.log('App: Authentication initialized, isAuthenticated:', isAuthenticated);
      setIsLoading(false);
    };
    init();
  }, [initialize]); // Don't include isAuthenticated in dependencies to avoid re-initialization

  // Check if user needs onboarding when authenticated
  useEffect(() => {
    if (isAuthenticated && principal) {
      console.log('Checking if user needs onboarding, userRole:', userRole);
      
      // If no role is set, immediately show onboarding
      if (!userRole) {
        console.log('No user role found, showing onboarding modal');
        setShowOnboarding(true);
        return;
      }
      
      // If role is set, check if profile exists
      const checkProfile = async () => {
        try {
          if (userRole === UserRoleValue.Patient) {
            await fetchPatientProfile();
            // Check the current state after fetch
            const currentState = useProfileStore.getState();
            if (!currentState.patientProfile) {
              console.log('No patient profile found, showing onboarding');
              setShowOnboarding(true);
            } else {
              console.log('Patient profile exists, hiding onboarding');
              setShowOnboarding(false);
            }
          } else if (userRole === UserRoleValue.HealthcareProvider) {
            await fetchHealthcareProviderProfile();
            // Check the current state after fetch
            const currentState = useProfileStore.getState();
            if (!currentState.healthcareProviderProfile) {
              console.log('No healthcare provider profile found, showing onboarding');
              setShowOnboarding(true);
            } else {
              console.log('Healthcare provider profile exists, hiding onboarding');
              setShowOnboarding(false);
            }
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // If there's an error fetching profile, assume it doesn't exist
          setShowOnboarding(true);
        }
      };
      checkProfile();
    } else {
      // If not authenticated, hide onboarding
      setShowOnboarding(false);
    }
  }, [isAuthenticated, principal, userRole, fetchPatientProfile, fetchHealthcareProviderProfile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MediVet...</p>
        </div>
      </div>
    );
  }

  console.log('App render - Authentication state:', { isAuthenticated, userRole, principal });
  
  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    console.log('Onboarding completed, refreshing profile state');
    setShowOnboarding(false);
    
    // Refresh the profile state after onboarding completion
    const { userRole } = useAuthStore.getState();
    if (userRole === UserRoleValue.Patient) {
      await fetchPatientProfile();
    } else if (userRole === UserRoleValue.HealthcareProvider) {
      await fetchHealthcareProviderProfile();
    }
  };
  
  // If still initializing auth, show loading
  if (isLoading) {
    return <div className="loading">Loading application...</div>;
  }
  
  return (
    <ToastProvider>
      <Router>
        <>
          {/* Onboarding Modal */}
          <ImprovedOnboardingModal 
            isOpen={showOnboarding} 
            onClose={handleOnboardingComplete} 
          />
          
          {/* Routes */}
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </>
      </Router>
    </ToastProvider>
  );
}

export default App;
