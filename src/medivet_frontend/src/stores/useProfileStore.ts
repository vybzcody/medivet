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
    currentMedications?: string | null
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
      const actor = await createAuthenticatedActor(identity);
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
      const actor = await createAuthenticatedActor(identity);
      
      let profileResult;
      if (patientPrincipal) {
        // Fetch specific patient profile by principal
        // Note: This would require a backend method to get patient profile by principal
        // For now, we'll simulate this by checking if we already have the profile
        const existingProfile = get().patientProfiles.find(p => p.owner === patientPrincipal);
        if (existingProfile) {
          set({ isLoading: false });
          return;
        }
        
        // In a real implementation, this would be:
        // profileResult = await actor.get_patient_profile_by_principal(patientPrincipal);
        // For now, we'll create a mock profile
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
        // Fetch current user's patient profile
        profileResult = await actor.get_patient_profile();
      }
      
      if (profileResult && profileResult.length > 0) {
        // Backend returns an optional, so check if profile exists
        const backendProfile = profileResult[0];
        const profile: PatientProfile = {
          owner: identity.getPrincipal().toString(),
          full_name: backendProfile.full_name,
          date_of_birth: backendProfile.date_of_birth,
          contact_info: backendProfile.contact_info,
          emergency_contact: backendProfile.emergency_contact,
          medical_history: backendProfile.medical_history,
          allergies: backendProfile.allergies,
          current_medications: backendProfile.current_medications,
          profile_permissions: backendProfile.profile_permissions || []
        };
        set({ patientProfile: profile, isLoading: false });
        console.log('Patient profile fetched successfully:', profile);
      } else {
        // No profile found
        set({ patientProfile: null, isLoading: false });
        console.log('No patient profile found');
      }
    } catch (error: any) {
      console.error("Error fetching patient profile:", error);
      set({ error: error.message, isLoading: false, patientProfile: null });
    }
  },
  
  createPatientProfile: async (fullName, dateOfBirth, contactInfo, emergencyContact, medicalHistory = null, allergies = null, currentMedications = null) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Call backend with all required parameters
      await actor.create_patient_profile(
        fullName, 
        dateOfBirth, 
        contactInfo, 
        emergencyContact,
        medicalHistory ? [medicalHistory] : [],
        allergies ? [allergies] : [],
        currentMedications ? [currentMedications] : []
      );
      
      // Fetch the created profile from backend to get the complete data
      const createdProfile = await actor.get_patient_profile();
      
      if (createdProfile && createdProfile.length > 0) {
        // Transform backend profile to frontend format
        const backendProfile = createdProfile[0];
        const profile: PatientProfile = {
          owner: backendProfile.owner,
          full_name: backendProfile.full_name,
          date_of_birth: backendProfile.date_of_birth,
          contact_info: backendProfile.contact_info,
          emergency_contact: backendProfile.emergency_contact,
          medical_history: backendProfile.medical_history,
          allergies: backendProfile.allergies,
          current_medications: backendProfile.current_medications,
          profile_permissions: backendProfile.profile_permissions || []
        };
        
        set({ patientProfile: profile, isLoading: false });
        console.log('Patient profile created successfully:', profile);
      } else {
        throw new Error('Failed to retrieve created profile');
      }
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
      const actor = await createAuthenticatedActor(identity);
      
      // Call backend with all required parameters
      await actor.update_patient_profile(
        fullName, 
        dateOfBirth, 
        contactInfo, 
        emergencyContact,
        medicalHistory ? [medicalHistory] : [],
        allergies ? [allergies] : [],
        currentMedications ? [currentMedications] : []
      );
      
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
      const actor = await createAuthenticatedActor(identity);
      
      const profileResult = await actor.get_healthcare_provider_profile();
      
      if (profileResult && profileResult.length > 0) {
        // Backend returns an optional, so check if profile exists
        const backendProfile = profileResult[0];
        const profile: HealthcareProviderProfile = {
          owner: "", // Backend doesn't return owner in current implementation
          full_name: backendProfile.name,
          specialization: backendProfile.specialty,
          license_number: backendProfile.license_number,
          contact_info: backendProfile.contact_info,
          facility_name: null, // Frontend-only field, not stored in backend
          facility_address: null // Frontend-only field, not stored in backend
        };
        set({ healthcareProviderProfile: profile, isLoading: false });
        console.log('Healthcare provider profile fetched successfully:', profile);
      } else {
        // No profile found
        set({ healthcareProviderProfile: null, isLoading: false });
        console.log('No healthcare provider profile found');
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
      const actor = await createAuthenticatedActor(identity);
      
      // Call backend with only the parameters it expects (name, specialty, license_number, contact_info)
      await actor.create_healthcare_provider_profile(
        fullName, 
        specialization, 
        licenseNumber, 
        contactInfo
      );
      
      // Fetch the created profile from backend to get the complete data
      const createdProfile = await actor.get_healthcare_provider_profile();
      
      if (createdProfile && createdProfile.length > 0) {
        // Transform backend profile to frontend format
        const backendProfile = createdProfile[0];
        const profile: HealthcareProviderProfile = {
          owner: "", // Backend doesn't return owner in current implementation
          full_name: backendProfile.name,
          specialization: backendProfile.specialty,
          license_number: backendProfile.license_number,
          contact_info: backendProfile.contact_info,
          facility_name: facilityName, // Frontend-only field
          facility_address: facilityAddress // Frontend-only field
        };
        
        set({ healthcareProviderProfile: profile, isLoading: false });
        console.log('Healthcare provider profile created successfully:', profile);
      } else {
        throw new Error('Failed to retrieve created profile');
      }
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
      const actor = await createAuthenticatedActor(identity);
      
      // Call backend with only the parameters it expects
      await actor.update_healthcare_provider_profile(
        fullName, 
        specialization, 
        licenseNumber, 
        contactInfo
      );
      
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

      const actor = await createAuthenticatedActor(identity);
      
      // Convert expiry date to nanoseconds if provided
      const expiryTime = expiresAt ? [BigInt(new Date(expiresAt).getTime()) * BigInt(1000000)] : [];
      
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

      const actor = await createAuthenticatedActor(identity);
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

      const actor = await createAuthenticatedActor(identity);
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

      const actor = await createAuthenticatedActor(identity);
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

      const actor = await createAuthenticatedActor(identity);
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

      const actor = await createAuthenticatedActor(identity);
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

      const actor = await createAuthenticatedActor(identity);
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
