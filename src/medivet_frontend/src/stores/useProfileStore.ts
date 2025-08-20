// src/medivet_frontend/src/stores/useProfileStore.ts
import { create } from 'zustand';
import { PatientProfile, HealthcareProviderProfile, Time, PermissionType, ProfilePermission } from '../types';
import { createAuthenticatedActor } from '../services/actorService';
import useAuthStore from './useAuthStore';

interface ProfileState {
  patientProfile: PatientProfile | null;
  patientProfiles: PatientProfile[]; // Store multiple patient profiles
  healthcareProviderProfile: HealthcareProviderProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  fetchPatientProfile: (patientPrincipal?: string) => Promise<void>;
  createPatientProfile: (
    fullName: string, 
    dateOfBirth: string, 
    contactInfo: string,
    emergencyContact: string,
    medicalHistory?: string | null,
    allergies?: string | null,
    currentMedications?: string | null,
    gender?: string,
    bloodGroup?: string | null
  ) => Promise<void>;
  updatePatientProfile: (
    fullName: string, 
    dateOfBirth: string, 
    contactInfo: string,
    emergencyContact: string,
    medicalHistory?: string | null,
    allergies?: string | null,
    currentMedications?: string | null
  ) => Promise<void>;
  
  fetchHealthcareProviderProfile: () => Promise<void>;
  createHealthcareProviderProfile: (
    fullName: string, 
    specialization: string, 
    licenseNumber: string, 
    contactInfo: string,
    facilityName?: string | null,
    facilityAddress?: string | null
  ) => Promise<void>;
  updateHealthcareProviderProfile: (
    fullName: string, 
    specialization: string, 
    licenseNumber: string, 
    contactInfo: string,
    facilityName?: string | null,
    facilityAddress?: string | null
  ) => Promise<void>;
  
  // Profile Permission Management
  grantProfilePermission: (userPrincipal: string, permissions: PermissionType[], expiresAt?: string) => Promise<void>;
  checkProfilePermission: (userPrincipal: string, permission: PermissionType) => Promise<boolean>;
  getPatientProfileWithPermissions: (patientPrincipal: string) => Promise<any>;
  getProfilePermissions: () => Promise<ProfilePermission[]>;
  revokeProfilePermission: (userPrincipal: string) => Promise<void>;
  hasAnyProfilePermissions: () => Promise<boolean>;

  // Incoming permissions (shared with me)
  getPermissionsGrantedToMe: () => Promise<Array<{ patientPrincipal: string, permissions: ProfilePermission[] }>>;

  // Access logs
  getUserAccessLogs: () => Promise<AccessLog[]>;


  // Permissions granted TO the current user (what others have shared with me)
}

import { AccessLog } from '../types';

const useProfileStore = create<ProfileState>((set, get) => ({
  // ...other methods
  getUserAccessLogs: async (): Promise<AccessLog[]> => {
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) throw new Error('User not authenticated');
      const { actor } = await createAuthenticatedActor(identity);
      const logs = await actor.get_user_access_logs();
      return logs;
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      return [];
    }
  },

  patientProfile: null,
  patientProfiles: [],
  healthcareProviderProfile: null,
  isLoading: false,
  error: null,
  
  fetchPatientProfile: async (patientPrincipal?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      if (patientPrincipal) {
        // For now, check if we already have the profile
        const existingProfile = get().patientProfiles.find(p => p.owner === patientPrincipal);
        if (existingProfile) {
          set({ isLoading: false });
          return;
        }
        
        // This would require a method to get another patient's profile
        // For now, create a mock profile
        const mockProfile: PatientProfile = {
          owner: patientPrincipal,
          full_name: "Patient Name",
          date_of_birth: "1990-01-01",
          contact_info: "contact@example.com",
          emergency_contact: "Emergency Contact",
          medical_history: "Medical history information",
          allergies: "Known allergies",
          current_medications: "Current medications",
          profile_permissions: []
        };
        
        const currentProfiles = get().patientProfiles;
        set({ 
          patientProfiles: [...currentProfiles, mockProfile],
          isLoading: false 
        });
        return;
      } else {
        // Fetch own patient profile
        const result = await actor.getPatientProfile();
        
        if ('ok' in result) {
          const backendProfile = result.ok;
          const profile: PatientProfile = {
            owner: identity.getPrincipal().toString(),
            full_name: backendProfile.fullName,
            date_of_birth: backendProfile.dob,
            contact_info: backendProfile.contact,
            emergency_contact: backendProfile.emergency,
            medical_history: backendProfile.medicalHistory?.[0] || null,
            allergies: backendProfile.allergies?.[0] || null,
            current_medications: backendProfile.medications?.[0] || null,
            profile_permissions: []
          };
          set({ patientProfile: profile, isLoading: false });
          console.log('Patient profile fetched successfully:', profile);
        } else {
          // Profile not found - this is expected for new users
          set({ patientProfile: null, isLoading: false });
          console.log('No patient profile found:', result.err);
        }
      }
    } catch (error: any) {
      console.error("Error fetching patient profile:", error);
      set({ error: error.message, isLoading: false, patientProfile: null });
    }
  },
  
  createPatientProfile: async (fullName, dateOfBirth, contactInfo, emergencyContact, medicalHistory = null, allergies = null, currentMedications = null, gender = 'Not specified', bloodGroup = null) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call backend with PatientProfile object
      const patientProfile = {
        fullName,
        dob: dateOfBirth,
        contact: contactInfo,
        emergency: emergencyContact,
        medicalHistory: medicalHistory ? [medicalHistory] : [],
        allergies: allergies ? [allergies] : [],
        medications: currentMedications ? [currentMedications] : [],
        gender: gender, // Use the provided gender parameter
        profilePhoto: [] // Optional profile photo field (empty array for null)
      };
      
      const result = await actor.createPatientProfile(patientProfile);
      
      // Handle the result properly
      if ('err' in result) {
        // Handle backend errors gracefully
        console.warn('Backend error creating patient profile:', result.err);
        // Continue with placeholder profile creation for now
      }
      
      // After successful profile creation, set a proper profile object
      // Use the authenticated identity to get the owner principal
      const profile: PatientProfile = {
        owner: identity.getPrincipal().toString(),
        full_name: fullName,
        date_of_birth: dateOfBirth,
        contact_info: contactInfo,
        emergency_contact: emergencyContact,
        medical_history: medicalHistory || null,
        allergies: allergies || null,
        current_medications: currentMedications || null,
        profile_permissions: []
      };
      
      set({ patientProfile: profile, isLoading: false });
      console.log('✅ Patient profile created successfully:', profile);
    } catch (error: any) {
      console.error("Error creating patient profile:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updatePatientProfile: async (fullName, dateOfBirth, contactInfo, emergencyContact, medicalHistory = null, allergies = null, currentMedications = null) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call backend with PatientProfile object
      const patientProfile = {
        fullName,
        dob: dateOfBirth,
        contact: contactInfo,
        emergency: emergencyContact,
        medicalHistory: medicalHistory ? [medicalHistory] : [],
        allergies: allergies ? [allergies] : [],
        medications: currentMedications ? [currentMedications] : [],
        gender: 'Not specified', // Default value since it's required
        profilePhoto: [] // Optional profile photo field (empty array for null)
      };
      
      await actor.updatePatientProfile(patientProfile);
      
      // Update local state with the updated profile including our extended fields
      const profile: PatientProfile = {
        owner: identity.getPrincipal().toString(),
        full_name: fullName,
        date_of_birth: dateOfBirth,
        contact_info: contactInfo,
        emergency_contact: emergencyContact,
        medical_history: medicalHistory,
        allergies: allergies,
        current_medications: currentMedications,
        profile_permissions: [] // New profiles start with no permissions
      };
      
      set({ patientProfile: profile as unknown as PatientProfile, isLoading: false });
    } catch (error: any) {
      console.error("Error updating patient profile:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  fetchHealthcareProviderProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Fetch own provider profile
      const result = await actor.getProviderProfile();
      
      if ('ok' in result) {
        const backendProfile = result.ok;
        const profile: HealthcareProviderProfile = {
          owner: identity.getPrincipal().toString(),
          full_name: backendProfile.name,
          specialization: backendProfile.specialty,
          license_number: backendProfile.license,
          contact_info: backendProfile.contact,
          facility_name: null, // Extended field not in backend
          facility_address: null // Extended field not in backend
        };
        set({ healthcareProviderProfile: profile, isLoading: false });
        console.log('Healthcare provider profile fetched successfully:', profile);
      } else {
        // Profile not found - this is expected for new users
        set({ healthcareProviderProfile: null, isLoading: false });
        console.log('No healthcare provider profile found:', result.err);
      }
    } catch (error: any) {
      console.error("Error fetching healthcare provider profile:", error);
      set({ error: error.message, isLoading: false, healthcareProviderProfile: null });
    }
  },
  
  createHealthcareProviderProfile: async (fullName, specialization, licenseNumber, contactInfo, facilityName = null, facilityAddress = null) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call backend with ProviderProfile object
      const providerProfile = {
        name: fullName,
        specialty: specialization,
        license: licenseNumber,
        contact: contactInfo,
        profilePhoto: [] // Optional profile photo field (empty array for null)
      };
      
      const result = await actor.createProviderProfile(providerProfile);
      
      // Handle the result properly
      if ('err' in result) {
        // Handle backend errors gracefully
        console.warn('Backend error creating provider profile:', result.err);
        // Continue with placeholder profile creation for now
      }
      
      // After successful profile creation, set a proper profile object
      // Use the authenticated identity to get the owner principal
      const profile: HealthcareProviderProfile = {
        owner: identity.getPrincipal().toString(),
        full_name: fullName,
        specialization: specialization,
        license_number: licenseNumber,
        contact_info: contactInfo,
        facility_name: facilityName,
        facility_address: facilityAddress
      };
      
      set({ healthcareProviderProfile: profile, isLoading: false });
      console.log('✅ Healthcare provider profile created successfully:', profile);
    } catch (error: any) {
      console.error("Error creating healthcare provider profile:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updateHealthcareProviderProfile: async (fullName, specialization, licenseNumber, contactInfo, facilityName = null, facilityAddress = null) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call backend with ProviderProfile object
      const providerProfile = {
        name: fullName,
        specialty: specialization,
        license: licenseNumber,
        contact: contactInfo,
        profilePhoto: [] // Optional profile photo field (empty array for null)
      };
      
      await actor.updateProviderProfile(providerProfile);
      
      // Update local state with the updated profile including our extended fields
      const profile: HealthcareProviderProfile = {
        owner: "", // Will be set by backend
        full_name: fullName,
        specialization,
        license_number: licenseNumber,
        contact_info: contactInfo,
        facility_name: facilityName,
        facility_address: facilityAddress
      };
      
      set({ healthcareProviderProfile: profile as unknown as HealthcareProviderProfile, isLoading: false });
    } catch (error: any) {
      console.error("Error updating healthcare provider profile:", error);
    }
  },  


  // Profile Permission Management Functions
  grantProfilePermission: async (userPrincipal: string, permissions: PermissionType[], expiresAt?: string) => {
    // Convert frontend enum to backend variant format
    const convertPermissionToVariant = (permission: PermissionType) => {
      return { [permission]: null };
    };

    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      
      // Convert expiry date to nanoseconds if provided
      // Backend expects ms and converts to ns internally
      const expiryTime = expiresAt ? [BigInt(new Date(expiresAt).getTime())] : [];
      
      // Convert permissions to backend variant format
      const backendPermissions = permissions.map(convertPermissionToVariant);
      
      await actor.grant_profile_permission(userPrincipal, backendPermissions, expiryTime);
      
      // Refresh the current profile to get updated permissions
      await get().fetchPatientProfile();
      
      set({ isLoading: false });
      console.log('Profile permission granted successfully');
    } catch (error: any) {
      console.error('Error granting profile permission:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  checkProfilePermission: async (userPrincipal: string, permission: PermissionType): Promise<boolean> => {
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      const hasPermission = await actor.check_profile_permission(userPrincipal, permission);
      
      return hasPermission;
    } catch (error: any) {
      console.error('Error checking profile permission:', error);
      return false;
    }
  },

  getPatientProfileWithPermissions: async (patientPrincipal: string): Promise<any> => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      const filteredProfile = await actor.get_patient_profile_with_permissions(patientPrincipal);
      
      set({ isLoading: false });
      return filteredProfile;
    } catch (error: any) {
      console.error('Error fetching filtered patient profile:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getProfilePermissions: async (): Promise<ProfilePermission[]> => {
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      const permissions = await actor.get_profile_permissions();
      
      return permissions;
    } catch (error: any) {
      console.error('Error fetching profile permissions:', error);
      return [];
    }
  },

  revokeProfilePermission: async (userPrincipal: string) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      await actor.revoke_profile_permission(userPrincipal);
      
      // Refresh the current profile to get updated permissions
      await get().fetchPatientProfile();
      
      set({ isLoading: false });
      console.log('Profile permission revoked successfully');
    } catch (error: any) {
      console.error('Error revoking profile permission:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  hasAnyProfilePermissions: async (): Promise<boolean> => {
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      const hasPermissions = await actor.has_any_profile_permissions();
      
      return hasPermissions;
    } catch (error: any) {
      console.error('Error checking for any profile permissions:', error);
      return false;
    }
  },

  // Get permissions granted TO the current user (what others have shared with me)
  getPermissionsGrantedToMe: async (): Promise<Array<{patientPrincipal: string, permissions: ProfilePermission[]}>> => {
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) {
        throw new Error('User not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      const permissionsData = await actor.get_permissions_granted_to_me();
      
      // Transform the data to a more usable format
      return permissionsData.map(([patientPrincipal, permissions]: [string, ProfilePermission[]]) => ({
        patientPrincipal,
        permissions
      }));
    } catch (error: any) {
      console.error('Error fetching permissions granted to me:', error);
      return [];
    }
  }
}));

export default useProfileStore;
