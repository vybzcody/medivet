// src/medivet_frontend/src/stores/useAuthStore.ts
import { create } from 'zustand';
import { medivet_backend } from '../../../declarations/medivet_backend';
import { AuthClient } from '@dfinity/auth-client';
// Use type import to avoid ESM/CJS conflicts
import { HttpAgent } from '@dfinity/agent';
import { UserRole } from '../types';
import { Actor, Identity } from '@dfinity/agent';
import { createAuthenticatedActor, clearAuthenticatedActor } from '../services/actorService';

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
        
        // Then try to get user role separately
        try {
          // Create an authenticated actor using our actor service
          const authenticatedActor = await createAuthenticatedActor(identity);
          
          // Use the authenticated actor to get the user role
          const userRole = await authenticatedActor.get_user_role();
          
          // Update the store with the user role
          set(state => ({ 
            ...state,
            userRole: userRole[0] as UserRole || null 
          }));
        } catch (roleError: any) {
          console.error("Error fetching user role during initialization:", roleError);
          // Don't fail the whole initialization if just the role fetch fails
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
      
      // Now try to get user role with the authenticated identity
      try {
        console.log('Fetching user role...');
        
        // Create an authenticated actor using our actor service
        const authenticatedActor = await createAuthenticatedActor(identity);
        
        const userRole = await authenticatedActor.get_user_role();
        console.log('User role:', userRole[0]);
        
        // Update the store with the user role
        set(state => ({ 
          ...state,
          userRole: userRole[0] as UserRole || null 
        }));
      } catch (roleError: any) {
        console.error("Error fetching user role:", roleError);
        // Don't fail the whole login if just the role fetch fails
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
      const authenticatedActor = await createAuthenticatedActor(identity);
      
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
      await authenticatedActor.createUser(backendRole);
      set({ userRole: role, isLoading: false });
      console.log('User role registered successfully:', role);
    } catch (error: any) {
      console.error('Set user role error:', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));

export default useAuthStore;
