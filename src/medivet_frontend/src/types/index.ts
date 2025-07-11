// src/medivet_frontend/src/types/index.ts

import { Principal } from '@dfinity/principal';

// Basic types
export type PrincipalName = string;
export type NoteId = number;
export type Time = bigint;

// Access control types
export enum AccessAction {
  View = 'View',
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  GrantAccess = 'GrantAccess',
  RevokeAccess = 'RevokeAccess'
}

export interface AccessLog {
  id: number;
  record_id: number;
  user: PrincipalName;
  timestamp: Time;
  action: AccessAction;
  success: boolean;
}

// User profile types
export interface ProfilePermission {
  user: PrincipalName;
  permissions: PermissionType[];
  granted_at: Time;
  expires_at: Time | null;
  granted_by: PrincipalName;
}

export interface PatientProfile {
  owner: PrincipalName;
  full_name: string;
  date_of_birth: string;
  contact_info: string;
  emergency_contact: string;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
  profile_permissions: ProfilePermission[];
}

// Filtered patient profile type for permission-based access
export interface FilteredPatientProfile {
  owner: PrincipalName;
  full_name: string | null;
  date_of_birth: string | null;
  contact_info: string | null;
  emergency_contact: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
}

export interface HealthcareProviderProfile {
  owner: PrincipalName;
  full_name: string;
  specialization: string;
  license_number: string;
  contact_info: string;
  facility_name: string | null;
  facility_address: string | null;
}

// Health record types

// Granular Permission System
export enum PermissionType {
  READ_BASIC_INFO = 'READ_BASIC_INFO',           // name, DOB, contact
  READ_MEDICAL_HISTORY = 'READ_MEDICAL_HISTORY', // medical history
  READ_MEDICATIONS = 'READ_MEDICATIONS',         // current medications
  READ_ALLERGIES = 'READ_ALLERGIES',             // allergies
  READ_LAB_RESULTS = 'READ_LAB_RESULTS',         // lab results
  READ_IMAGING = 'READ_IMAGING',                 // imaging results
  READ_MENTAL_HEALTH = 'READ_MENTAL_HEALTH',     // mental health records
  WRITE_NOTES = 'WRITE_NOTES',                   // add notes to records
  WRITE_PRESCRIPTIONS = 'WRITE_PRESCRIPTIONS',   // add prescriptions
  EMERGENCY_ACCESS = 'EMERGENCY_ACCESS'          // emergency access override
}

export interface UserPermission {
  user: PrincipalName;
  permissions: PermissionType[];
  granted_at: Time;
  expires_at: Time | null;
  granted_by: PrincipalName;
}

export interface HealthRecord {
  id: number;
  owner: PrincipalName;
  title: string;
  category: string;
  provider: string;
  record_date: Time;
  record_type: string;
  encrypted_content: Uint8Array;
  attachment_id: number | null;
  user_permissions: UserPermission[];
  content?: string; // Decrypted content for display
}

// Permission preset configurations for easy sharing
export const PermissionPresets = {
  VIEW_ONLY: [
    PermissionType.READ_BASIC_INFO,
    PermissionType.READ_MEDICAL_HISTORY,
    PermissionType.READ_MEDICATIONS,
    PermissionType.READ_ALLERGIES,
    PermissionType.READ_LAB_RESULTS,
    PermissionType.READ_IMAGING
  ],
  FULL_ACCESS: [
    PermissionType.READ_BASIC_INFO,
    PermissionType.READ_MEDICAL_HISTORY,
    PermissionType.READ_MEDICATIONS,
    PermissionType.READ_ALLERGIES,
    PermissionType.READ_LAB_RESULTS,
    PermissionType.READ_IMAGING,
    PermissionType.READ_MENTAL_HEALTH,
    PermissionType.WRITE_NOTES,
    PermissionType.WRITE_PRESCRIPTIONS
  ],
  EMERGENCY_CONTACT: [
    PermissionType.READ_BASIC_INFO,
    PermissionType.READ_MEDICAL_HISTORY,
    PermissionType.READ_MEDICATIONS,
    PermissionType.READ_ALLERGIES,
    PermissionType.EMERGENCY_ACCESS
  ]
} as const;

// Auth types
export enum UserRole {
  Patient = 'PATIENT',
  HealthcareProvider = 'HEALTHCARE_PROVIDER'
}

// Create a value-based enum for runtime use
export const UserRoleValue = {
  Patient: 'PATIENT',
  HealthcareProvider: 'HEALTHCARE_PROVIDER'
} as const;

// Note types (legacy system)
export interface EncryptedNote {
  encrypted_text: string;
  id: number;
  owner: PrincipalName;
  users: PrincipalName[];
}
