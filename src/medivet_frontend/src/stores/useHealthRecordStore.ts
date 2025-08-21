import { create } from 'zustand';
import { Principal } from '@dfinity/principal';
import { HealthRecord, AccessLog, UserRole } from '../types';
import useAuthStore from './useAuthStore';
import { createAuthenticatedActor } from '../services/actorService';
import { CryptoService } from '../services/CryptoService';
import { safeTimestampToDate } from '../utils/dateUtils';

interface HealthRecordState {
  records: HealthRecord[];
  sharedRecords: HealthRecord[];
  currentRecord: HealthRecord | null;
  decryptedContent: string | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  lastSharedFetchTime: number | null;
  
  // Methods
  fetchRecords: () => Promise<void>;
  fetchSharedRecords: () => Promise<void>;
  fetchSharedRecordsWithoutDecryption: () => Promise<void>;
  createRecord: (
    title: string, 
    category: string, 
    provider: string, 
    recordType: string, 
    content: string,
    attachmentId?: number | null
  ) => Promise<number>;
  updateRecord: (id: number, content: string) => Promise<void>;
  deleteRecord: (id: number) => Promise<void>;
  grantAccess: (recordId: number, userPrincipal: string) => Promise<void>;
  grantSpecificAccess: (recordId: number, userPrincipal: string, permissions: string[], expiryDate?: string) => Promise<void>;
  revokeAccess: (recordId: number, userPrincipal: string) => Promise<void>;
  getRecordAccessLogs: (recordId: number) => Promise<AccessLog[]>;
  setCurrentRecord: (record: HealthRecord | null) => Promise<void>;
  decryptRecord: (record: HealthRecord) => Promise<string>;
  decryptHealthRecord: (record: HealthRecord) => Promise<HealthRecord>;
}

const useHealthRecordStore = create<HealthRecordState>((set, get) => ({
  records: [],
  sharedRecords: [],
  currentRecord: null,
  decryptedContent: null,
  isLoading: false,
  error: null,
  lastFetchTime: null,
  lastSharedFetchTime: null,
  
  // Helper function to decrypt a single health record
  decryptHealthRecord: async (record: HealthRecord): Promise<HealthRecord> => {
    try {
      const { principal } = useAuthStore.getState();
      if (!principal) {
        throw new Error('User not authenticated');
      }

      // The encrypted_content is already a Uint8Array from the backend
      // We need to convert it to base64 for the CryptoService which expects base64 strings
      const encryptedContentBase64 = CryptoService.arrayBufferToBase64(record.encrypted_content);
      
      // Decrypt the content
      const decryptedContent = await CryptoService.decryptWithRecordKey(
        BigInt(record.id),
        record.owner, // Use record.owner instead of current user principal
        encryptedContentBase64
      );

      // Return record with decrypted content (we'll add a content field for display)
      return {
        ...record,
        content: decryptedContent
      } as HealthRecord & { content: string };
    } catch (error) {
      console.error('Error decrypting health record:', error);
      // Return record with empty content if decryption fails
      return {
        ...record,
        content: 'Unable to decrypt content'
      } as HealthRecord & { content: string };
    }
  },

  fetchRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity, userRole, refreshUserRole } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Check if user has the correct role
      if (userRole !== UserRole.Patient) {
        // Try to refresh user role first
        await refreshUserRole();
        const updatedState = useAuthStore.getState();
        
        if (updatedState.userRole !== UserRole.Patient) {
          throw new Error('Only patients can access health records. Please complete your profile setup.');
        }
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.getHealthRecords();
      
      if ('ok' in result) {
        // Transform backend records to frontend format
        const transformedRecords = result.ok.map((record: any) => {
          // Safely convert timestamps
          const createdAtDate = safeTimestampToDate(record.createdAt);
          const modifiedAtDate = safeTimestampToDate(record.modifiedAt);
          
          return {
            id: Number(record.id),
            title: record.title,
            category: record.category,
            provider: 'Unknown', // Backend doesn't store provider field
            record_type: record.category, // Use category as record type
            record_date: createdAtDate ? createdAtDate.getTime() : Date.now(),
            encrypted_content: new Uint8Array(record.encryptedBlob),
            attachment_id: record.attachment ? Number(record.attachment) : null,
            user_permissions: [], // Backend doesn't have user permissions in HealthRecord
            access_count: Number(record.accessCount),
            created_at: createdAtDate ? createdAtDate.getTime() : Date.now(),
            updated_at: modifiedAtDate ? modifiedAtDate.getTime() : Date.now(),
            owner: record.owner.toString()
          };
        });
        
        set({ 
          records: transformedRecords, 
          isLoading: false, 
          lastFetchTime: Date.now() 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch records');
      }
    } catch (error: any) {
      console.error("Error fetching health records:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchSharedRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity, userRole, refreshUserRole } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Check if user is a provider to access shared records
      if (userRole !== UserRole.HealthcareProvider) {
        // Try to refresh user role first
        await refreshUserRole();
        const updatedState = useAuthStore.getState();
        
        if (updatedState.userRole !== UserRole.HealthcareProvider) {
          // Instead of throwing an error, just return empty results for non-providers
          console.log('User is not a healthcare provider, returning empty shared records');
          set({ 
            sharedRecords: [], 
            isLoading: false, 
            lastSharedFetchTime: Date.now()
          });
          return;
        }
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.getSharedHealthRecords();
      
      if ('ok' in result) {
        // Transform backend records to frontend format
        const transformedRecords = result.ok.map((record: any) => {
          // Safely convert timestamps
          const createdAtDate = safeTimestampToDate(record.createdAt);
          const modifiedAtDate = safeTimestampToDate(record.modifiedAt);
          
          return {
            id: Number(record.id),
            title: record.title,
            category: record.category,
            provider: 'Unknown', // Backend doesn't store provider field
            record_type: record.category, // Use category as record type
            record_date: createdAtDate ? createdAtDate.getTime() : Date.now(),
            encrypted_content: new Uint8Array(record.encryptedBlob),
            attachment_id: record.attachment ? Number(record.attachment) : null,
            user_permissions: record.userPermissions || [], // Transform permissions
            access_count: Number(record.accessCount),
            created_at: createdAtDate ? createdAtDate.getTime() : Date.now(),
            updated_at: modifiedAtDate ? modifiedAtDate.getTime() : Date.now(),
            owner: record.owner.toString()
          };
        });
        
        // Decrypt each record
        const decryptedRecords = await Promise.all(
          transformedRecords.map(async (record: HealthRecord) => {
            try {
              return await get().decryptHealthRecord(record);
            } catch (error) {
              console.error(`Failed to decrypt record ${record.id}:`, error);
              return {
                ...record,
                content: 'Unable to decrypt content - insufficient permissions'
              } as HealthRecord & { content: string };
            }
          })
        );
        
        set({ 
          sharedRecords: decryptedRecords, 
          isLoading: false, 
          lastSharedFetchTime: Date.now() 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch shared records');
      }
    } catch (error: any) {
      console.error("Error fetching shared health records:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch shared records without automatic decryption (for provider dashboard)
  fetchSharedRecordsWithoutDecryption: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity, userRole, refreshUserRole } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Check if user is a provider
      if (userRole !== UserRole.HealthcareProvider) {
        // Try to refresh user role first
        await refreshUserRole();
        const updatedState = useAuthStore.getState();
        
        if (updatedState.userRole !== UserRole.HealthcareProvider) {
          // Instead of throwing an error, just return empty results for non-providers
          console.log('User is not a healthcare provider, returning empty shared records');
          set({ 
            sharedRecords: [], 
            isLoading: false, 
            lastSharedFetchTime: Date.now()
          });
          return;
        }
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.getSharedHealthRecords();
      
      if ('ok' in result) {
        console.log('🚀 Raw backend shared records result:', result.ok.length, 'records');
        
        // Transform backend records to frontend format without decrypting
        const transformedRecords = result.ok.map((record: any) => {
          console.log('🔄 Transforming backend record:', record.id, 'userPermissions:', record.userPermissions);
          
          // Safely convert timestamps
          const createdAtDate = safeTimestampToDate(record.createdAt);
          const modifiedAtDate = safeTimestampToDate(record.modifiedAt);
          
          // Transform userPermissions from backend format
          const transformedPermissions = (record.userPermissions || []).map((perm: any) => {
            console.log('🔄 Transforming permission:', perm);
            
            // Extract permission names from backend variant format
            const permissionNames = (perm.permissions || []).map((p: any) => {
              // Backend sends permissions as variants like { ReadBasicInfo: null }
              const key = Object.keys(p)[0];
              // Convert to frontend enum format
              switch (key) {
                case 'ReadBasicInfo': return 'READ_BASIC_INFO';
                case 'ReadMedicalHistory': return 'READ_MEDICAL_HISTORY';
                case 'ReadMedications': return 'READ_MEDICATIONS';
                case 'ReadAllergies': return 'READ_ALLERGIES';
                case 'ReadLabResults': return 'READ_LAB_RESULTS';
                case 'ReadImaging': return 'READ_IMAGING';
                case 'ReadMentalHealth': return 'READ_MENTAL_HEALTH';
                case 'WriteNotes': return 'WRITE_NOTES';
                case 'WritePrescriptions': return 'WRITE_PRESCRIPTIONS';
                case 'EmergencyAccess': return 'EMERGENCY_ACCESS';
                default: return key;
              }
            });
            
            return {
              user: perm.user.toString(),
              permissions: permissionNames,
              granted_at: Number(perm.grantedAt),
              expires_at: perm.expiresAt ? Number(perm.expiresAt) : null,
              granted_by: perm.grantedBy.toString()
            };
          });
          
          const transformedRecord = {
            id: Number(record.id),
            title: record.title,
            category: record.category,
            provider: 'Unknown', // Backend doesn't store provider field
            record_type: record.category, // Use category as record type
            record_date: createdAtDate ? createdAtDate.getTime() : Date.now(),
            encrypted_content: new Uint8Array(record.encryptedBlob),
            attachment_id: record.attachment ? Number(record.attachment) : null,
            user_permissions: transformedPermissions,
            access_count: Number(record.accessCount),
            created_at: createdAtDate ? createdAtDate.getTime() : Date.now(),
            updated_at: modifiedAtDate ? modifiedAtDate.getTime() : Date.now(),
            owner: record.owner.toString()
          };
          
          console.log('✅ Transformed record:', transformedRecord.id, 'permissions:', transformedRecord.user_permissions);
          return transformedRecord;
        });
        
        set({ 
          sharedRecords: transformedRecords, 
          isLoading: false, 
          lastSharedFetchTime: Date.now() 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch shared records');
      }
    } catch (error: any) {
      console.error("Error fetching shared health records:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  createRecord: async (title, category, provider, recordType, content, attachmentId = null) => {
    set({ isLoading: true, error: null });
    try {
      const { identity, principal } = useAuthStore.getState();
      
      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // First, create the record with placeholder content
      // This is needed so the record exists in the backend before we can encrypt
      const placeholderBlob = new Uint8Array([0]); // Minimal placeholder
      
      const createResult = await actor.createHealthRecord(
        title,
        category,
        placeholderBlob,
        attachmentId ? [BigInt(attachmentId)] : [],
        { Monetizable: null } // Default status
      );
      
      if (!('ok' in createResult)) {
        throw new Error(createResult.err || 'Failed to create record');
      }
      
      const recordId = Number(createResult.ok);
      
      // Now encrypt the content using the real record ID
      const encryptedContent = await CryptoService.encryptWithRecordKey(
        BigInt(recordId),
        principal,
        content
      );
      
      // Convert encrypted content to blob (browser-compatible)
      const binaryString = atob(encryptedContent);
      const encryptedBlob = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        encryptedBlob[i] = binaryString.charCodeAt(i);
      }
      
      // Update the record with encrypted content
      const updateResult = await actor.updateHealthRecord(
        BigInt(recordId),
        title,
        category,
        encryptedBlob
      );
      
      if (!('ok' in updateResult)) {
        // If update fails, we should delete the placeholder record
        try {
          await actor.deleteRecord(BigInt(recordId));
        } catch (deleteError) {
          console.warn('Failed to clean up placeholder record:', deleteError);
        }
        throw new Error(updateResult.err || 'Failed to encrypt and update record');
      }
      
      // Refresh the records list
      await get().fetchRecords();
      
      set({ isLoading: false });
      return recordId;
    } catch (error: any) {
      console.error("Error creating health record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updateRecord: async (id, content) => {
    set({ isLoading: true, error: null });
    try {
      const { identity, principal } = useAuthStore.getState();
      
      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Find the current record to get its existing data
      const currentRecord = get().records.find(r => r.id === id);
      if (!currentRecord) {
        throw new Error('Record not found');
      }
      
      // Encrypt the new content
      const encryptedContent = await CryptoService.encryptWithRecordKey(
        BigInt(id),
        principal,
        content
      );
      
      // Convert encrypted content to blob (browser-compatible)
      const binaryString = atob(encryptedContent);
      const encryptedBlob = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        encryptedBlob[i] = binaryString.charCodeAt(i);
      }
      
      // Call the backend method
      const result = await actor.updateHealthRecord(
        BigInt(id),
        currentRecord.title,
        currentRecord.category,
        encryptedBlob
      );
      
      if ('ok' in result) {
        // Refresh the records list
        await get().fetchRecords();
        
        set({ isLoading: false });
      } else {
        throw new Error(result.err || 'Failed to update record');
      }
    } catch (error: any) {
      console.error("Error updating health record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  deleteRecord: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // This method exists in the backend
      await actor.deleteRecord(BigInt(id));
      
      // Remove the record from the local state
      const updatedRecords = get().records.filter(record => record.id !== id);
      set({ records: updatedRecords, isLoading: false });
    } catch (error: any) {
      console.error("Error deleting health record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
grantAccess: async (recordId, userPrincipal) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) throw new Error('User not authenticated');
      const { actor } = await createAuthenticatedActor(identity);
      const userPrincipalObj = Principal.fromText(userPrincipal);
      // Basic preset maps to ReadBasicInfo
      const backendPermissions = [{ ReadBasicInfo: null }];
      const result = await actor.grantSpecificAccess(
        BigInt(recordId),
        userPrincipalObj,
        backendPermissions,
        [] // no expiry
      );
      if ('ok' in result) {
        set({ isLoading: false });
      } else {
        throw new Error(result.err || 'Failed to grant access');
      }
    } catch (error: any) {
      console.error('Error granting access:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

grantSpecificAccess: async (recordId, userPrincipal, permissions, expiryDate) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      if (!identity) throw new Error('User not authenticated');
      const { actor } = await createAuthenticatedActor(identity);
      const userPrincipalObj = Principal.fromText(userPrincipal);

      // Map frontend PermissionType enum values to backend variant names
const mapPermission = (p: string) => {
        switch (p) {
          case 'READ_BASIC_INFO': return { ReadBasicInfo: null };
          case 'READ_MEDICAL_HISTORY': return { ReadMedicalHistory: null };
          case 'READ_MEDICATIONS': return { ReadMedications: null };
          case 'READ_ALLERGIES': return { ReadAllergies: null };
          case 'READ_LAB_RESULTS': return { ReadLabResults: null };
          case 'READ_IMAGING': return { ReadImaging: null };
          case 'READ_MENTAL_HEALTH': return { ReadMentalHealth: null };
          case 'WRITE_NOTES': return { WriteNotes: null };
          case 'WRITE_PRESCRIPTIONS': return { WritePrescriptions: null };
          case 'EMERGENCY_ACCESS': return { EmergencyAccess: null };
          default: throw new Error(`Unknown permission: ${p}`);
        }
      };
      const backendPermissions = permissions.map(mapPermission);

      // Convert expiry date (yyyy-mm-dd) to ms BigInt (backend converts mse ns)
      const expiryOpt = expiryDate ? [BigInt(new Date(expiryDate).getTime())] : [];

      const result = await actor.grantSpecificAccess(
        BigInt(recordId),
        userPrincipalObj,
        backendPermissions,
        expiryOpt
      );
      if ('ok' in result) {
        set({ isLoading: false });
      } else {
        throw new Error(result.err || 'Failed to grant specific access');
      }
    } catch (error: any) {
      console.error('Error granting specific access:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  revokeAccess: async (recordId, userPrincipal) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Convert userPrincipal string to Principal
      const userPrincipalObj = Principal.fromText(userPrincipal);
      
      // Call the backend method
      const result = await actor.revokeAccess(
        BigInt(recordId),
        userPrincipalObj
      );
      
      if ('ok' in result) {
        set({ isLoading: false });
      } else {
        throw new Error(result.err || 'Failed to revoke access');
      }
    } catch (error: any) {
      console.error("Error revoking access:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  getRecordAccessLogs: async (recordId) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Call the backend method
      const result = await actor.getRecordAccessLogs(BigInt(recordId));
      
      if ('ok' in result) {
        // Transform backend logs to frontend format
        const transformedLogs = result.ok.map((log: any) => ({
          id: Number(log.id),
          record_id: Number(log.recordId),
          provider_principal: log.provider.toString(),
          access_time: Number(log.ts),
          paid_amount: Number(log.paidMT),
          action: 'Accessed' // Default action since backend doesn't specify
        }));
        
        set({ isLoading: false });
        return transformedLogs;
      } else {
        throw new Error(result.err || 'Failed to fetch access logs');
      }
    } catch (error: any) {
      console.error("Error fetching record access logs:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  setCurrentRecord: async (record) => {
    set({ currentRecord: record, decryptedContent: null });
    
    // If a record is selected, decrypt its content
    if (record) {
      try {
        const decryptedContent = await get().decryptRecord(record);
        set({ decryptedContent });
      } catch (error: any) {
        console.error("Error decrypting record:", error);
        set({ error: error.message });
      }
    }
  },
  
  decryptRecord: async (record) => {
    set({ isLoading: true, error: null });
    try {
      // Get the current user's principal
      const { principal } = useAuthStore.getState();
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      // Convert the Uint8Array to base64 string for decryption
      const encryptedContentBase64 = CryptoService.arrayBufferToBase64(record.encrypted_content);
      
      // Decrypt the content using the record owner
      const decryptedContent = await CryptoService.decryptWithRecordKey(
        BigInt(record.id), 
        record.owner, // Use record.owner instead of current principal
        encryptedContentBase64
      );
      
      set({ isLoading: false });
      return decryptedContent;
    } catch (error: any) {
      console.error("Error decrypting record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));

export default useHealthRecordStore;
