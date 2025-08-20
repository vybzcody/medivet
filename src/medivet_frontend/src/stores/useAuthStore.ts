// src/medivet_frontend/src/stores/useAuthStore.ts
import { create } from 'zustand';
import { medivet_backend } from '../../../declarations/medivet_backend';
import { AuthClient } from '@dfinity/auth-client';
// Use type import to avoid ESM/CJS conflicts
import { HttpAgent } from '@dfinity/agent';
import { UserRole } from '../types';
import { Actor, Identity } from '@dfinity/agent';
import { createAuthenticatedActor, clearAuthenticatedActor } from '../services/actorService';
import { fileService } from '../services/fileService';

interface AuthState {
  isAuthenticated: boolean;
  identity: any; // Use any to avoid ESM/CJS conflicts
  principal: string | null;
  userRole: UserRole | null;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  identity: null,
  principal: null,
  userRole: null,
  isLoading: false,
  error: null,
  
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const authClient = await AuthClient.create();
      
      if (await authClient.isAuthenticated()) {
        const identity = authClient.getIdentity();
        const principal = identity.getPrincipal();
        
        // First update authentication state
        set({ 
          isAuthenticated: true, 
          identity: identity as any,
          principal: principal.toString(),
          isLoading: false 
        });
        
        // Initialize file service with the authenticated identity
        try {
          await fileService.initializeVaultActor(identity);
          console.log('File service initialized during auth initialization');
        } catch (fileError: any) {
          console.error('Failed to initialize file service:', fileError);
        }
        
        // Then try to get user information separately
        try {
          // Create an authenticated actor using our actor service
          const { actor: authenticatedActor } = await createAuthenticatedActor(identity);
          
          // Use the authenticated actor to get the full user information
          const userResult = await authenticatedActor.getUser();
          
          if ('ok' in userResult) {
            const user = userResult.ok;
            let frontendRole: UserRole | null = null;
            
            // Convert backend role to frontend role
            if (user.role.Patient !== undefined) {
              frontendRole = UserRole.Patient;
            } else if (user.role.Provider !== undefined) {
              frontendRole = UserRole.HealthcareProvider;
            }
            
            // Update the store with the user role
            set(state => ({ 
              ...state,
              userRole: frontendRole
            }));
          } else {
            // User not found - this is normal for new users
            console.log("User not yet registered:", userResult.err);
          }
        } catch (roleError: any) {
          console.error("Error fetching user during initialization:", roleError);
          // Don't fail the whole initialization if just the user fetch fails
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  login: async () => {
    console.log('Login started');
    console.log('Environment variables:', {
      DFX_NETWORK: import.meta.env.VITE_DFX_NETWORK,
      CANISTER_ID_INTERNET_IDENTITY: import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY,
      CANISTER_ID_MEDIVET_BACKEND: import.meta.env.VITE_CANISTER_ID_MEDIVET_BACKEND
    });
    set({ isLoading: true, error: null });
    try {
      const authClient = await AuthClient.create();
      console.log('AuthClient created');
      
      // Start the login flow and wait for it to complete
      await new Promise<void>((resolve) => {
        console.log('Starting login flow');
        authClient.login({
          maxTimeToLive: BigInt(1800) * BigInt(1_000_000_000), // 30 minutes in nanoseconds
          identityProvider: import.meta.env.VITE_DFX_NETWORK === 'ic' 
            ? 'https://identity.ic0.app/#authorize'
            : `http://${import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'u6s2n-gx777-77774-qaaba-cai'}.localhost:4943/`,
          onSuccess: () => {
            console.log('Login success callback');
            resolve();
          },
        });
      });
      
      console.log('Login flow completed');
      
      // After login success, update the store with identity
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      console.log('Got identity and principal:', principal.toString());
      
      // Important: First update the store with authentication state
      // before trying to call backend methods
      set({ 
        isAuthenticated: true, 
        identity: identity as any,
        principal: principal.toString(),
        isLoading: false 
      });
      
      // Initialize file service with the authenticated identity
      try {
        await fileService.initializeVaultActor(identity);
        console.log('File service initialized during login');
      } catch (fileError: any) {
        console.error('Failed to initialize file service:', fileError);
      }
      
      // Now try to get user information with the authenticated identity
      try {
        console.log('Fetching user information...');
        
        // Create an authenticated actor using our actor service
        const { actor: authenticatedActor } = await createAuthenticatedActor(identity);
        
        const userResult = await authenticatedActor.getUser();
        console.log('User result:', userResult);
        
        if ('ok' in userResult) {
          const user = userResult.ok;
          let frontendRole: UserRole | null = null;
          
          // Convert backend role to frontend role
          if (user.role.Patient !== undefined) {
            frontendRole = UserRole.Patient;
          } else if (user.role.Provider !== undefined) {
            frontendRole = UserRole.HealthcareProvider;
          } else if (user.role.Admin !== undefined) {
            frontendRole = UserRole.Admin;
          }
          
          // Update the store with the user role
          set(state => ({ 
            ...state,
            userRole: frontendRole
          }));
          
          console.log('User found with role:', frontendRole);
        } else {
          console.log('User not yet registered:', userResult.err);
          // User not found - this is normal for new users
          // They will need to go through onboarding
        }
      } catch (roleError: any) {
        console.error("Error fetching user information:", roleError);
        // Don't fail the whole login if just the user fetch fails
        // The user is still authenticated, they just might need to set their role
      }
      
      console.log('Auth store state updated, isAuthenticated:', true);
    } catch (error: any) {
      console.error("Login error:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const authClient = await AuthClient.create();
      await authClient.logout();
      
      // Clear the authenticated actor
      clearAuthenticatedActor();
      
      set({ 
        isAuthenticated: false, 
        identity: null, 
        principal: null,
        userRole: null,
        isLoading: false 
      });
      
      console.log('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      set({ error: error.message });
    }
  },
  
  setUserRole: async (role: UserRole) => {
    set({ isLoading: true, error: null });
    try {
      const state = useAuthStore.getState();
      const identity = state.identity;
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Create an authenticated actor using our actor service
      const { actor: authenticatedActor } = await createAuthenticatedActor(identity);
      
      // Convert frontend UserRole to backend Role variant format
      let backendRole;
      if (role === UserRole.Patient) {
        backendRole = { 'Patient': null };
      } else if (role === UserRole.HealthcareProvider) {
        backendRole = { 'Provider': null };
      } else {
        throw new Error('Invalid user role');
      }
      
      // Use the authenticated actor to create user with role
      const result = await authenticatedActor.createUser(backendRole);
      
      // Handle the result properly
      if ('ok' in result) {
        set({ userRole: role, isLoading: false });
        console.log('User role registered successfully:', role);
      } else {
        // Handle backend errors
        const errorMessage = result.err;
        if (errorMessage === 'already registered') {
          // User is already registered, this is actually okay
          console.log('User already registered, continuing with existing role');
          set({ userRole: role, isLoading: false });
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Set user role error:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  refreshUserRole: async () => {
    const state = get();
    if (!state.isAuthenticated || !state.identity) {
      return;
    }
    
    try {
      // Create an authenticated actor using our actor service
      const { actor: authenticatedActor } = await createAuthenticatedActor(state.identity);
      
      // Get the full user information
      const userResult = await authenticatedActor.getUser();
      
      if ('ok' in userResult) {
        const user = userResult.ok;
        let frontendRole: UserRole | null = null;
        
        // Convert backend role to frontend role
        if (user.role.Patient !== undefined) {
          frontendRole = UserRole.Patient;
        } else if (user.role.Provider !== undefined) {
          frontendRole = UserRole.HealthcareProvider;
        } else if (user.role.Admin !== undefined) {
          frontendRole = UserRole.Admin;
        }
        
        // Update the store with the user role
        set(state => ({ 
          ...state,
          userRole: frontendRole
        }));
        
        console.log('User role refreshed:', frontendRole);
      } else {
        console.log('User not found during refresh:', userResult.err);
        set(state => ({ 
          ...state,
          userRole: null
        }));
      }
    } catch (error: any) {
      console.error('Error refreshing user role:', error);
    }
  }
}));

export default useAuthStore;
