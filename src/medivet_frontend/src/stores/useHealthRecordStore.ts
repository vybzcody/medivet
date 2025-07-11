// src/medivet_frontend/src/stores/useHealthRecordStore.ts
import { create } from 'zustand';
import { HealthRecord } from '../types';
import useAuthStore from './useAuthStore';
import { createAuthenticatedActor } from '../services/actorService';
import { CryptoService } from '../services/CryptoService';
import { AccessLog } from '../../../declarations/medivet_backend/medivet_backend.did';

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

      // Convert Uint8Array to string
      const encryptedContentString = new TextDecoder().decode(record.encrypted_content);
      
      // Decrypt the content
      const decryptedContent = await CryptoService.decryptWithRecordKey(
        BigInt(record.id),
        principal,
        encryptedContentString
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
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      const records = await actor.get_health_records();
      
      // Decrypt all records
      const decryptedRecords = await Promise.all(
        (records as unknown as HealthRecord[]).map(record => 
          get().decryptHealthRecord(record)
        )
      );
      
      set({ 
        records: decryptedRecords, 
        isLoading: false, 
        lastFetchTime: Date.now() 
      });
    } catch (error: any) {
      console.error("Error fetching health records:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchSharedRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      const sharedRecords = await actor.get_shared_health_records();
      
      // Decrypt all shared records
      const decryptedSharedRecords = await Promise.all(
        (sharedRecords as unknown as HealthRecord[]).map(record => 
          get().decryptHealthRecord(record)
        )
      );
      
      set({ 
        sharedRecords: decryptedSharedRecords, 
        isLoading: false, 
        lastSharedFetchTime: Date.now()
      });
    } catch (error: any) {
      console.error("Error fetching shared health records:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch shared records without automatic decryption (for provider dashboard)
  fetchSharedRecordsWithoutDecryption: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      const actor = await createAuthenticatedActor(identity);
      const records = await actor.get_shared_health_records();
      
      // Don't decrypt - just set the raw records
      set({ 
        sharedRecords: records, 
        isLoading: false, 
        lastSharedFetchTime: Date.now() 
      });
    } catch (error: any) {
      console.error("Error fetching shared health records:", error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  createRecord: async (title, category, provider, recordType, content, attachmentId = null) => {
    set({ isLoading: true, error: null });
    try {
      // Get the current user's principal
      const { principal } = useAuthStore.getState();
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Create the record in the backend first (without content)
      const recordId = await actor.create_health_record(
        title, 
        category, 
        provider, 
        recordType, 
        attachmentId ? [attachmentId] : []
      );
      
      // Now encrypt content with the actual record ID
      const encryptedContent = await CryptoService.encryptWithRecordKey(
        BigInt(recordId), 
        principal, 
        content
      );
      
      // Convert the encrypted string to Uint8Array for storage
      const contentBytes = new TextEncoder().encode(encryptedContent);
      
      // Update the record with the encrypted content
      await actor.update_health_record(BigInt(recordId), Uint8Array.from(contentBytes));
      
      // Refresh records after creation
      await get().fetchRecords();
      set({ isLoading: false });
      return Number(recordId);
    } catch (error: any) {
      console.error("Error creating health record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updateRecord: async (id, content) => {
    set({ isLoading: true, error: null });
    try {
      // Get the current user's principal
      const { principal } = useAuthStore.getState();
      if (!principal) {
        throw new Error('User not authenticated');
      }
      
      // Encrypt the content
      const encryptedContent = await CryptoService.encryptWithRecordKey(
        BigInt(id), 
        principal, 
        content
      );
      
      // Convert the encrypted string to Uint8Array for storage
      const contentBytes = new TextEncoder().encode(encryptedContent);
      
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Update the record in the backend
      await actor.update_health_record(BigInt(id), contentBytes);
      
      // Refresh records after update
      await get().fetchRecords();
      set({ isLoading: false });
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
      const actor = await createAuthenticatedActor(identity);
      
      await actor.delete_health_record(BigInt(id));
      
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
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      await actor.grant_access(BigInt(recordId), userPrincipal);
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error granting access:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  grantSpecificAccess: async (recordId, userPrincipal, permissions, expiryDate) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      // Convert permissions to backend format
      const backendPermissions = permissions.map(p => ({ [p]: null }));
      
      // Convert expiry date to nanoseconds if provided
      let expiryNanos = null;
      if (expiryDate) {
        const expiryTime = new Date(expiryDate).getTime() * 1000000; // Convert to nanoseconds
        expiryNanos = [BigInt(expiryTime)];
      }
      
      await actor.grant_specific_access(BigInt(recordId), userPrincipal, backendPermissions, expiryNanos);
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error granting specific access:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  revokeAccess: async (recordId, userPrincipal) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      await actor.revoke_access(BigInt(recordId), userPrincipal);
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error revoking access:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  getRecordAccessLogs: async (recordId) => {
    set({ isLoading: true, error: null });
    try {
      // Get the identity from the auth store
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const actor = await createAuthenticatedActor(identity);
      
      const logs = await actor.get_record_access_logs(BigInt(recordId));
      set({ isLoading: false });
      return logs as unknown as AccessLog[];
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
      
      // Convert the Uint8Array to a string for decryption
      const encryptedContent = new TextDecoder().decode(record.encrypted_content);
      
      // Decrypt the content
      const decryptedContent = await CryptoService.decryptWithRecordKey(
        BigInt(record.id), 
        principal, 
        encryptedContent
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
