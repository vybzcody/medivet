import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/useAuthStore';
import useProfileStore from './stores/useProfileStore';
import LandingPage from './components/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import Profile from './components/profile/Profile';
import PatientBilling from './components/dashboard/PatientBilling';
import Marketplace from './components/marketplace/Marketplace';
import AdminPanel from './components/admin/AdminPanel';
import UserManagement from './components/admin/UserManagement';
import PurchasedRecords from './components/provider/PurchasedRecords';
import RecordDetail from './components/records/RecordDetail';
import EnhancedOnboarding from './components/onboarding/EnhancedOnboarding';
import Layout from './components/ui/Layout';
import ImprovedOnboardingModal from './components/onboarding/ImprovedOnboardingModal';
import OnboardingDemo from './components/demo/OnboardingDemo';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { ToastProvider } from './hooks/useToast';
import { UserRoleValue } from './types';
import { createAuthenticatedActor } from './services/actorService';

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
  const [profileCheckComplete, setProfileCheckComplete] = useState(false);
  const [backendOnboardingCompleted, setBackendOnboardingCompleted] = useState<boolean | null>(null);

  // Persisted onboarding completion per principal to avoid repeat prompts
  const onboardingKey = useMemo(() => (principal ? `onboarding:${principal}` : null), [principal]);
  const onboardingCompletedLocal = useMemo(() => {
    if (!onboardingKey) return false;
    try {
      return localStorage.getItem(onboardingKey) === '1';
    } catch {
      return false;
    }
  }, [onboardingKey]);

  // Combined view: consider backend flag authoritative if true, otherwise local
  const onboardingCompleted = useMemo(() => {
    return Boolean(backendOnboardingCompleted) || onboardingCompletedLocal;
  }, [backendOnboardingCompleted, onboardingCompletedLocal]);
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

  // When authenticated, fetch backend onboarding completion once
  useEffect(() => {
    const fetchBackendOnboarding = async () => {
      try {
        if (isAuthenticated && principal) {
          const authState = useAuthStore.getState();
          if (!authState.identity) return;
          const { actor } = await createAuthenticatedActor(authState.identity);
          const completed: boolean = await actor.get_onboarding_completed();
          setBackendOnboardingCompleted(Boolean(completed));
        } else {
          setBackendOnboardingCompleted(null);
        }
      } catch (e) {
        console.error('Error fetching backend onboarding flag:', e);
        setBackendOnboardingCompleted(null);
      }
    };
    fetchBackendOnboarding();
  }, [isAuthenticated, principal]);

  // Check if user needs onboarding when authenticated
  useEffect(() => {
    if (isAuthenticated && principal && !profileCheckComplete) {
      console.log('=== ONBOARDING CHECK ===');
      console.log('User authenticated, checking onboarding status...');
      console.log('userRole:', userRole);
      console.log('principal:', principal);
      
      // If no role is set, consider onboarding unless already completed previously
      if (!userRole) {
        if (onboardingCompleted) {
          console.log('ℹ️ Onboarding previously completed; not showing modal despite missing role.');
          setShowOnboarding(false);
          setProfileCheckComplete(true);
          return;
        }
        console.log('❌ No user role found, showing onboarding modal');
        setShowOnboarding(true);
        setProfileCheckComplete(true);
        return;
      }
      
      // Check if profile already exists in store first (immediate check)
      const currentState = useProfileStore.getState();
      console.log('Current profile state:', {
        patientProfile: !!currentState.patientProfile,
        healthcareProviderProfile: !!currentState.healthcareProviderProfile
      });
      
      if (userRole === UserRoleValue.Patient && currentState.patientProfile) {
        console.log('✅ Patient profile exists in store, hiding onboarding');
        setShowOnboarding(false);
        setProfileCheckComplete(true);
        return;
      }
      
      if (userRole === UserRoleValue.HealthcareProvider && currentState.healthcareProviderProfile) {
        console.log('✅ Provider profile exists in store, hiding onboarding');
        setShowOnboarding(false);
        setProfileCheckComplete(true);
        return;
      }
      
      // If no profile in store, try to fetch from backend
      console.log('⏳ No profile in store, fetching from backend...');
      const checkProfile = async () => {
        try {
          if (userRole === UserRoleValue.Patient) {
            console.log('Fetching patient profile from backend...');
            await fetchPatientProfile();
            // Check the current state after fetch
            const updatedState = useProfileStore.getState();
            if (!updatedState.patientProfile) {
              if (!onboardingCompleted) {
                console.log('❌ No patient profile found in backend, showing onboarding');
                setShowOnboarding(true);
              } else {
                console.log('ℹ️ Onboarding previously completed; not showing modal despite missing profile.');
                setShowOnboarding(false);
              }
            } else {
              console.log('✅ Patient profile exists in backend, hiding onboarding');
              setShowOnboarding(false);
            }
          } else if (userRole === UserRoleValue.HealthcareProvider) {
            console.log('Fetching provider profile from backend...');
            await fetchHealthcareProviderProfile();
            // Check the current state after fetch
            const updatedState = useProfileStore.getState();
            if (!updatedState.healthcareProviderProfile) {
              if (!onboardingCompleted) {
                console.log('❌ No healthcare provider profile found in backend, showing onboarding');
                setShowOnboarding(true);
              } else {
                console.log('ℹ️ Onboarding previously completed; not showing modal despite missing profile.');
                setShowOnboarding(false);
              }
            } else {
              console.log('✅ Healthcare provider profile exists in backend, hiding onboarding');
              setShowOnboarding(false);
            }
          }
        } catch (error) {
          console.error('❌ Error checking profile:', error);
          // If there's an error fetching profile, assume it doesn't exist
          setShowOnboarding(true);
        } finally {
          setProfileCheckComplete(true);
          console.log('=== ONBOARDING CHECK COMPLETE ===');
        }
      };
      checkProfile();
    } else if (!isAuthenticated) {
      // If not authenticated, hide onboarding and reset profile check
      console.log('User not authenticated, resetting onboarding state');
      setShowOnboarding(false);
      setProfileCheckComplete(false);
    }
  }, [isAuthenticated, principal, userRole, fetchPatientProfile, fetchHealthcareProviderProfile, profileCheckComplete, onboardingCompleted]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Initializing MediVet..." />
        </div>
      </div>
    );
  }

  console.log('App render - Authentication state:', { isAuthenticated, userRole, principal });
  
  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    console.log('=== ONBOARDING COMPLETION ===');
    console.log('Onboarding completed, refreshing profile state');

    // Persist completion to avoid future prompts for this principal
    try {
      if (onboardingKey) localStorage.setItem(onboardingKey, '1');
    } catch {}

    // Persist to backend as well
    try {
      const authState = useAuthStore.getState();
      if (authState.identity) {
        const { actor } = await createAuthenticatedActor(authState.identity);
        await actor.set_onboarding_completed();
        setBackendOnboardingCompleted(true);
      }
    } catch (e) {
      console.error('Failed to persist onboarding completion to backend:', e);
    }
    
    // Hide the onboarding modal immediately
    setShowOnboarding(false);
    
    // Reset the profile check state to allow re-validation
    setProfileCheckComplete(false);
    
    // Small delay to ensure state updates
    setTimeout(() => {
      console.log('Triggering profile re-check after onboarding completion');
      // This will trigger the useEffect to re-run with the new profile state
      setProfileCheckComplete(false);
    }, 100);
    
    console.log('=== ONBOARDING COMPLETION FINISHED ===');
  };
  
  // If still initializing auth, show loading
  if (isLoading) {
    return <div className="loading">Loading application...</div>;
  }
  
  return (
    <ToastProvider>
      <Router>
        <>
          {/* Fullscreen loading spinner while checking profiles/onboarding after auth */}
          {isAuthenticated && !profileCheckComplete && (
            <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
              <LoadingSpinner size="lg" text="Checking your profile and permissions..." />
            </div>
          )}

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
                isAuthenticated ? (
                  <Layout>
                    <Dashboard />
                  </Layout>
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/profile" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <Profile />
                  </Layout>
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/billing" 
              element={
                isAuthenticated && userRole === UserRoleValue.Patient ? (
                  <Layout>
                    <PatientBilling />
                  </Layout>
                ) : <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="/marketplace" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <Marketplace />
                  </Layout>
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/admin" 
              element={
                isAuthenticated && userRole === UserRoleValue.Admin ? (
                  <Layout>
                    <AdminPanel />
                  </Layout>
                ) : <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="/users" 
              element={
                isAuthenticated && userRole === UserRoleValue.Admin ? (
                  <Layout>
                    <UserManagement />
                  </Layout>
                ) : <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="/purchased" 
              element={
                isAuthenticated && userRole === UserRoleValue.HealthcareProvider ? (
                  <Layout>
                    <PurchasedRecords />
                  </Layout>
                ) : <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="/record/:id" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <RecordDetail />
                  </Layout>
                ) : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/onboarding" 
              element={<EnhancedOnboarding />} 
            />
            <Route 
              path="/demo" 
              element={<OnboardingDemo />} 
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
